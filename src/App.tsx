import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Notes from "./pages/Notes";
import NotesCalendar from "./pages/NotesCalendar";
import Settings from "./pages/Settings";
import Reminders from "./pages/Reminders";
import Auth from "./pages/Auth";
import Today from "./pages/todo/Today";
import Upcoming from "./pages/todo/Upcoming";
import TodoCalendar from "./pages/todo/TodoCalendar";
import TodoSettings from "./pages/todo/TodoSettings";
import CustomToolDetail from "./pages/todo/CustomToolDetail";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import NotFound from "./pages/NotFound";
import { notificationManager } from "@/utils/notifications";
import { pushNotificationService } from "@/utils/pushNotifications";

const queryClient = new QueryClient();

const AppContent = () => {
  useEffect(() => {
    // Initialize local notifications
    notificationManager.initialize().catch(console.error);
    
    // Initialize push notifications (for native platforms)
    pushNotificationService.initialize().catch(console.error);
  }, []);

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/calendar" element={<NotesCalendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/todo/today" element={<Today />} />
          <Route path="/todo/upcoming" element={<Upcoming />} />
          <Route path="/todo/calendar" element={<TodoCalendar />} />
          <Route path="/todo/settings" element={<TodoSettings />} />
          <Route path="/todo/tool/:toolId" element={<CustomToolDetail />} />
          <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
