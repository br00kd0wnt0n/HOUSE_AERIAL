import React from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';

const DeleteConfirmation = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  itemName,
  confirmText = "Delete",
  cancelText = "Cancel",
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-netflix-red">{title}</DialogTitle>
          <DialogDescription className="pt-2">
            {description}
            {itemName && (
              <div className="mt-2 font-medium text-white">{itemName}</div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex space-x-2 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DeleteConfirmation }; 