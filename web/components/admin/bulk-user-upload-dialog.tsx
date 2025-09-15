'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BulkUserUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkUserUploadDialog({ open, onOpenChange, onSuccess }: BulkUserUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please select a CSV file');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API}/users/bulk-upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let msg = 'Failed to upload users';
        try {
          const err = await res.json();
          msg = err?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success('Users uploaded successfully');
      setFile(null);
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to upload users');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Users</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple users at once.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            {file && (
              <div className="text-xs text-muted-foreground">
                Selected: {file.name}
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending || !file}>
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}