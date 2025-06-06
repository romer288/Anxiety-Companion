import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Share, Plus, Home } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function IOSInstallGuide() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Home className="h-4 w-4" />
          <span>Install on iOS</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Install on your iOS device</DialogTitle>
          <DialogDescription>
            Follow these steps to add Anxiety Companion to your home screen
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium flex items-center mb-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">1</span>
              Tap the Share icon
            </h3>
            <div className="flex justify-center mb-2">
              <Share className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-600">
              Tap the share icon at the bottom of your Safari browser.
            </p>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium flex items-center mb-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">2</span>
              Tap "Add to Home Screen"
            </h3>
            <div className="flex justify-center mb-2">
              <Plus className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-600">
              Scroll down in the share menu and tap "Add to Home Screen".
            </p>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium flex items-center mb-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">3</span>
              Tap "Add"
            </h3>
            <div className="flex justify-center mb-2">
              <Home className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-600">
              Confirm by tapping "Add" in the top-right corner. You'll now have the app on your home screen.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}