'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userRole: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  createdAt: string;
  parentId?: string;
}

interface ChatSidebarProps {
  lessonId: string;
  onClose: () => void;
}

export function ChatSidebar({ lessonId, onClose }: ChatSidebarProps) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages from backend
  useEffect(() => {
    if (!lessonId || !token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lessons/${lessonId}/messages`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then((data: Message[]) => setMessages(data))
      .catch(console.error);
  }, [lessonId, token]);

  // Initialize Socket.IO
  useEffect(() => {
    if (!lessonId || !user || !token) return;

    socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
      auth: { token },
      query: { lessonId, userId: user.id },
    });

    socketRef.current.on('connect', () => setIsConnected(true));
    socketRef.current.on('disconnect', () => setIsConnected(false));

    // Listen for new messages
    socketRef.current.on('newMessage', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Join lesson room
    socketRef.current.emit('joinLesson', lessonId);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [lessonId, user, token]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !socketRef.current) return;

    const messagePayload = {
      content: newMessage,
      lessonId,
      parentId: replyTo,
    };

    socketRef.current.emit('sendMessage', messagePayload);
    setNewMessage('');
    setReplyTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'INSTRUCTOR': return 'bg-blue-100 text-blue-800';
      case 'STUDENT': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return `${Math.floor(diffInHours * 60)}m ago`;
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="fixed right-0 top-0 bottom-0 w-96 bg-background shadow-2xl z-50 border-l"
      >
        <Card className="h-full rounded-none border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <CardTitle>Lesson Q&A</CardTitle>
              {isConnected && (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-0 flex flex-col h-[calc(100%-120px)]">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 pb-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2"
                  >
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(message.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{message.userName}</span>
                          <Badge className={`text-xs rounded-lg ${getRoleBadgeColor(message.userRole)}`}>
                            {message.userRole}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground break-words">{message.content}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyTo(message.id)}
                          className="text-xs text-muted-foreground hover:text-foreground h-6 px-0 mt-1"
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {replyTo && (
              <div className="px-4 py-2 bg-muted/50 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Replying to {messages.find(m => m.id === replyTo)?.userName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyTo(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question..."
                  className="flex-1 rounded-xl"
                  disabled={!isConnected}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  size="sm"
                  className="px-3 rounded-xl primary-gradient"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
