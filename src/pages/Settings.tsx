import { BottomNavigation } from '@/components/BottomNavigation';
import { ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import appLogo from '@/assets/app-logo.png';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { SyncSettings } from '@/components/SyncSettings';

const Settings = () => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  const handleBackupData = () => {
    const notes = localStorage.getItem('notes') || '[]';
    const folders = localStorage.getItem('folders') || '[]';
    const backup = { notes, folders, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `npd-backup-${Date.now()}.json`;
    a.click();
    toast({ title: "Data backed up successfully" });
  };

  const handleRestoreData = () => {
    setShowRestoreDialog(true);
  };

  const confirmRestoreData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const backup = JSON.parse(event.target?.result as string);
            if (backup.notes) localStorage.setItem('notes', backup.notes);
            if (backup.folders) localStorage.setItem('folders', backup.folders);
            toast({ title: "Data restored successfully" });
            setTimeout(() => window.location.reload(), 1000);
          } catch (error) {
            toast({ title: "Failed to restore data", variant: "destructive" });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setShowRestoreDialog(false);
  };

  const handleDownloadData = () => {
    const allData = {
      notes: localStorage.getItem('notes'),
      folders: localStorage.getItem('folders'),
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `npd-data-${Date.now()}.json`;
    a.click();
    toast({ title: "Data downloaded" });
  };

  const handleDeleteData = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteData = () => {
    localStorage.clear();
    toast({ title: "All data deleted" });
    setShowDeleteDialog(false);
    setTimeout(() => window.location.href = '/', 1000);
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'NPD - Note Taking App',
        text: 'Check out this amazing note-taking app!',
        url: window.location.origin
      });
    } else {
      toast({ title: "Share feature not available on this device" });
    }
  };

  const settingsItems = [
    { label: 'Back up data', onClick: handleBackupData },
    { label: 'Restore data', onClick: handleRestoreData },
    { label: 'Download my data', onClick: handleDownloadData },
    { label: 'Delete app data', onClick: handleDeleteData },
  ];

  const handleRateAndShare = () => {
    window.open('https://play.google.com/store/apps/details?id=app.nota.com', '_blank');
  };

  const otherItems = [
    { label: 'Share with friends', onClick: handleRateAndShare },
    { label: 'Terms of Service', onClick: () => setShowTermsDialog(true) },
    { label: 'Help and feedback', onClick: () => setShowHelpDialog(true) },
    { label: 'Privacy', onClick: () => setShowPrivacyDialog(true) },
    { label: 'Rate app', onClick: handleRateAndShare },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-background pb-20">
      <header className="border-b sticky top-0 bg-white dark:bg-card z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <img src={appLogo} alt="Npd" className="h-8 w-8" />
            <h1 className="text-xl font-bold">Npd</h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Cloud Sync Section */}
          <SyncSettings />
          
          {/* Settings Items */}
          <div className="space-y-1">
          {settingsItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-gray-50 dark:hover:bg-card transition-colors"
            >
              <span className="text-foreground text-sm">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}

          <div className="flex items-center gap-2 px-4 py-3">
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm font-medium">Other</span>
          </div>

          {otherItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-gray-50 dark:hover:bg-card transition-colors"
            >
              <span className="text-foreground text-sm">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          </div>
        </div>
      </main>

      <BottomNavigation />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Data?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">⚠️ Warning: This action cannot be undone!</p>
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All your notes and folders</li>
                <li>All settings and preferences</li>
                <li>All local data stored in this app</li>
              </ul>
              <p className="font-medium mt-2">Are you absolutely sure you want to continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteData} className="bg-destructive hover:bg-destructive/90">
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Data from Backup?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-orange-600">⚠️ Important Notice:</p>
              <p>Restoring data will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Replace all current notes and folders</li>
                <li>Overwrite existing data with backup data</li>
                <li>Reload the app after restoration</li>
              </ul>
              <p className="font-medium mt-2">Make sure you have backed up your current data if needed.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestoreData}>
              Continue to Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terms of Service Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
                <p className="text-muted-foreground">By accessing and using NPD, you accept and agree to be bound by the terms and provision of this agreement.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">2. Use License</h3>
                <p className="text-muted-foreground">Permission is granted to temporarily use NPD for personal, non-commercial transitory viewing only.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">3. User Data</h3>
                <p className="text-muted-foreground">All notes and data are stored locally on your device. You are responsible for backing up your data regularly.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">4. Disclaimer</h3>
                <p className="text-muted-foreground">The app is provided "as is" without warranty of any kind. We do not guarantee that the app will be error-free or uninterrupted.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">5. Limitations</h3>
                <p className="text-muted-foreground">In no event shall NPD or its suppliers be liable for any damages arising out of the use or inability to use the app.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">6. Modifications</h3>
                <p className="text-muted-foreground">We may revise these terms at any time without notice. By using this app, you agree to be bound by the current version of these terms.</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold mb-2">1. Information We Collect</h3>
                <p className="text-muted-foreground">NPD stores all your notes and data locally on your device. We do not collect, transmit, or store any personal information on external servers.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">2. Local Storage</h3>
                <p className="text-muted-foreground">Your notes, folders, and settings are stored using your device's local storage. This data remains on your device and is not accessible to us.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">3. Data Security</h3>
                <p className="text-muted-foreground">Since all data is stored locally, the security of your information depends on your device's security measures. We recommend using device encryption and strong passwords.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">4. Third-Party Services</h3>
                <p className="text-muted-foreground">We do not use any third-party analytics or tracking services. Your data is completely private and stays on your device.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">5. Data Backup</h3>
                <p className="text-muted-foreground">You can backup your data using the backup feature. Backup files are stored on your device and you control where they are kept.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">6. Changes to Privacy Policy</h3>
                <p className="text-muted-foreground">We may update this privacy policy from time to time. Continued use of the app after changes constitutes acceptance of the updated policy.</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Help and Feedback Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Help & Feedback</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold mb-2">Getting Started</h3>
                <p className="text-muted-foreground">Create your first note by tapping the "+" button on the home screen. Choose from various note types including sticky notes, lined notes, Cornell notes, and more.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Organizing Notes</h3>
                <p className="text-muted-foreground">Use folders to organize your notes. Long-press on a note to move it to a different folder or pin it to the top.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Backup & Restore</h3>
                <p className="text-muted-foreground">Regularly backup your data using the "Back up data" option. Keep your backup files in a safe location like cloud storage.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Common Issues</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Notes not saving? Check your device storage space.</li>
                  <li>App running slow? Try clearing old notes or creating a backup and reinstalling.</li>
                  <li>Lost data? Restore from your latest backup file.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Contact Support</h3>
                <p className="text-muted-foreground">For additional help or to report issues, please contact us through the app store review section or reach out via our support channels.</p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Feedback</h3>
                <p className="text-muted-foreground">We value your feedback! Let us know how we can improve NPD by rating the app and leaving a review.</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
