import React, { useState } from 'react';
import { CreateSidebar } from '../components/create/CreateSidebar';
import { ChatWorkspace } from '../components/create/ChatWorkspace';
import { SpatialWorkspace } from '../components/create/SpatialWorkspace';
import { ChatSessionItem } from '../components/create/ChatHistory';
import { ChatMessageItem } from '../components/create/ChatMessage';
import { CurrentTripContext } from '../components/create/CurrentTrip';
import { TripFormData } from '../types/trip';
import { useTheme } from '../context/ThemeContext';
import { createTrip, sendTripMessage, getTripMessages } from '../services/tripService';

interface CreateTripProps {
  onBuildUniverse?: (formData: TripFormData) => void;
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateProfile?: () => void;
  onNavigateLogin?: () => void;
  onNavigateSignup?: () => void;
}

// Initial mock conversation sessions for realistic UI demonstration and testing
const INITIAL_SESSIONS: ChatSessionItem[] = [
  {
    id: 'session-japan-2026',
    title: 'Japan Sakura Voyage',
    timestamp: '2 hours ago',
    preview: '10 days covering Tokyo, Kyoto, Nara, and Osaka temples...',
    messageCount: 3,
    tripContext: {
      destination: 'Japan',
      days: 10,
      budget: 3500,
    },
  },
  {
    id: 'session-swiss-2026',
    title: 'Swiss Alps Expedition',
    timestamp: 'Yesterday',
    preview: 'Scenic rail & hiking through Zurich, Interlaken, and Zermatt...',
    messageCount: 2,
    tripContext: {
      destination: 'Switzerland',
      days: 7,
      budget: 4200,
    },
  },
];

const INITIAL_MESSAGES_MAP: Record<string, ChatMessageItem[]> = {
  'session-japan-2026': [
    {
      id: 'msg-1',
      sender: 'user',
      content:
        'Plan a 10-day cultural journey to Japan focusing on traditional temples, tea ceremonies, vibrant street food in Osaka, and modern art in Tokyo with a budget of $3,500.',
      timestamp: '10:30 AM',
      metadata: {
        destination: 'Japan',
        duration: '10 Days',
        budget: '$3,500',
      },
    },
    {
      id: 'msg-2',
      sender: 'system',
      content:
        'Trip context captured: Japan (10 days, $3,500 budget). Agent planning stage initialized.',
      timestamp: '10:31 AM',
      stage: 'ONBOARDING CHECKPOINT',
    },
    {
      id: 'msg-3',
      sender: 'assistant',
      content:
        'Welcome to TripVerse Planning. I have mapped your initial 10-day route starting in Tokyo (Days 1–4), transitioning via Shinkansen to Kyoto & Nara (Days 5–8), and concluding with culinary explorations in Osaka (Days 9–10). Would you like to refine specific districts in Tokyo or start reviewing hotel recommendations?',
      timestamp: '10:31 AM',
    },
  ],
  'session-swiss-2026': [
    {
      id: 'msg-s1',
      sender: 'user',
      content:
        'Create a 7-day scenic road and rail trip across Switzerland covering Zurich, Interlaken, and Zermatt with scenic hiking and alpine vistas.',
      timestamp: 'Yesterday',
      metadata: {
        destination: 'Switzerland',
        duration: '7 Days',
        budget: '$4,200',
      },
    },
    {
      id: 'msg-s2',
      sender: 'system',
      content:
        'Trip context captured: Switzerland (7 days, $4,200 budget). Route topology ready for review.',
      timestamp: 'Yesterday',
      stage: 'ROUTE TOPOLOGY',
    },
  ],
};

const INITIAL_TRIP_CONTEXT_MAP: Record<string, CurrentTripContext> = {
  'session-japan-2026': {
    title: 'Japan Sakura Voyage',
    destination: 'Japan (Tokyo, Kyoto, Osaka)',
    days: 10,
    budget: 3500,
    currency: 'USD',
    travelers: 2,
    status: 'ONBOARDING',
    interests: ['Culture', 'Temples', 'Food', 'Modern Art'],
  },
  'session-swiss-2026': {
    title: 'Swiss Alps Expedition',
    destination: 'Switzerland (Zurich, Zermatt)',
    days: 7,
    budget: 4200,
    currency: 'USD',
    travelers: 1,
    status: 'ROUTING',
    interests: ['Hiking', 'Scenic Trains', 'Nature'],
  },
};

export const CreateTrip: React.FC<CreateTripProps> = ({
  onBuildUniverse,
  onNavigateHome,
  onNavigateExplore,
  onNavigateProfile,
  onNavigateLogin,
  onNavigateSignup,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [sessions, setSessions] = useState<ChatSessionItem[]>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] =
    useState<Record<string, ChatMessageItem[]>>(INITIAL_MESSAGES_MAP);
  const [tripContextMap, setTripContextMap] =
    useState<Record<string, CurrentTripContext>>(INITIAL_TRIP_CONTEXT_MAP);
  const [sessionTripIdMap, setSessionTripIdMap] = useState<Record<string, string>>({});

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('tripverse-sidebar-open');
    if (saved !== null) return saved === 'true';
    return window.innerWidth >= 1024;
  });

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 320;
    const saved = localStorage.getItem('tripverse-sidebar-width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 240 && parsed <= 520) return parsed;
    }
    return 320;
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('tripverse-sidebar-open', String(next));
      return next;
    });
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
    localStorage.setItem('tripverse-sidebar-open', 'false');
  };

  const handleSidebarWidthChange = (newWidth: number) => {
    setSidebarWidth(newWidth);
    localStorage.setItem('tripverse-sidebar-width', String(newWidth));
  };

  const [isSpatialOpen, setIsSpatialOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const activeMessages = activeSessionId ? messagesMap[activeSessionId] || [] : [];
  const activeTripContext = activeSessionId ? tripContextMap[activeSessionId] || null : null;
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // New Chat Handler
  const handleNewChat = () => {
    setActiveSessionId(null);
  };

  // Select Session Handler
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  // Delete Session Handler
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
  };

  // Send Message Handler — Connected to Backend LangGraph Agent
  const handleSendMessage = async (content: string, _attachments?: File[]) => {
    let currentId = activeSessionId;

    // If starting from empty welcome state, create a new local session
    if (!currentId) {
      currentId = `session-${Date.now()}`;
      const title = content.slice(0, 32).trim() + (content.length > 32 ? '...' : '');

      const newSession: ChatSessionItem = {
        id: currentId,
        title: title.toUpperCase(),
        timestamp: 'Just now',
        preview: content.slice(0, 60) + '...',
        messageCount: 1,
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(currentId);
    }

    const timeStr = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(new Date());

    const userMessage: ChatMessageItem = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content,
      timestamp: timeStr,
    };

    // Add user message immediately for responsive UX
    setMessagesMap((prev) => ({
      ...prev,
      [currentId!]: [...(prev[currentId!] || []), userMessage],
    }));

    // Update preview in sidebar
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentId
          ? {
              ...s,
              messageCount: (s.messageCount || 0) + 1,
              timestamp: 'Just now',
              preview: content.slice(0, 60) + '...',
            }
          : s
      )
    );

    setIsLoading(true);

    try {
      // 1. Resolve or create backend trip ID
      let backendTripId = sessionTripIdMap[currentId!];
      if (!backendTripId) {
        const createRes = await createTrip();
        if (createRes?.trip_id) {
          backendTripId = createRes.trip_id;
          setSessionTripIdMap((prev) => ({ ...prev, [currentId!]: backendTripId }));
        }
      }

      if (!backendTripId) {
        throw new Error('Could not establish backend trip session');
      }

      // 2. Send message to backend LangGraph agent
      const stateRes = await sendTripMessage(backendTripId, content);

      if (stateRes) {
        const trip = stateRes.trip;
        const conversation = stateRes.conversation;

        // 3. Extract assistant message directly from response (zero redundant roundtrips)
        const assistantText =
          stateRes.assistant_message?.content ||
          (trip.destination && trip.duration_days
            ? `Perfect! We have ${trip.duration_days} days in ${trip.destination}. We're ready to start planning!`
            : `Where would you like to travel?`);


        // Check if metadata was extracted
        const extractedMetadata: any = {};
        if (trip.destination) extractedMetadata.destination = trip.destination;
        if (trip.duration_days) extractedMetadata.duration = `${trip.duration_days} Days`;
        if (trip.origin_text) extractedMetadata.budget = trip.origin_text;

        const assistantMessage: ChatMessageItem = {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          content: assistantText,
          timestamp: new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
          }).format(new Date()),
          metadata: Object.keys(extractedMetadata).length > 0 ? extractedMetadata : undefined,
        };

        const newMessagesList: ChatMessageItem[] = [
          ...(messagesMap[currentId!] || []),
          userMessage,
          assistantMessage,
        ];

        // If onboarding complete, add system checkpoint notification
        if (trip.onboarding_status === 'COMPLETE' || conversation?.current_stage === 'COMPLETE') {
          const checkpointMessage: ChatMessageItem = {
            id: `sys-${Date.now()}`,
            sender: 'system',
            content: `Trip parameters captured: ${trip.destination} (${trip.duration_days} Days${
              trip.origin_text ? `, from ${trip.origin_text}` : ''
            }). Onboarding complete.`,
            timestamp: new Intl.DateTimeFormat('en-US', {
              hour: 'numeric',
              minute: 'numeric',
              hour12: true,
            }).format(new Date()),
            stage: 'ONBOARDING CHECKPOINT',
          };
          newMessagesList.push(checkpointMessage);
        }

        setMessagesMap((prev) => ({
          ...prev,
          [currentId!]: newMessagesList,
        }));

        // 4. Update Trip Context for Sidebar & Spatial Workspace
        if (trip.destination || trip.duration_days) {
          const updatedContext: CurrentTripContext = {
            title: trip.destination ? `${trip.destination} Expedition` : 'New Voyage',
            destination: trip.destination || 'Unspecified',
            days: trip.duration_days || 0,
            budget: 0,
            currency: 'USD',
            travelers: 1,
            status: trip.onboarding_status === 'COMPLETE' ? 'ROUTING' : 'ONBOARDING',
            interests: ['Exploration', 'Culture'],
          };

          setTripContextMap((prev) => ({
            ...prev,
            [currentId!]: updatedContext,
          }));

          // Update session title in sidebar
          if (trip.destination) {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === currentId
                  ? {
                      ...s,
                      title: `${trip.destination} VOYAGE`.toUpperCase(),
                      tripContext: {
                        destination: trip.destination!,
                        days: trip.duration_days || undefined,
                      },
                    }
                  : s
              )
            );
          }
        }
      }
    } catch (err: any) {
      console.error('Backend LangGraph interaction failed:', err);

      // Graceful fallback system notification
      const fallbackMessage: ChatMessageItem = {
        id: `sys-err-${Date.now()}`,
        sender: 'system',
        content: `Backend response: ${err?.message || 'Agent service busy'}. Message recorded locally.`,
        timestamp: new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        }).format(new Date()),
        stage: 'AGENT STATUS',
      };

      setMessagesMap((prev) => ({
        ...prev,
        [currentId!]: [...(prev[currentId!] || []), fallbackMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Starter Prompt Handler
  const handleSelectPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  // Launch Full Universe in legacy 3D canvas
  const handleBuildFullUniverse = () => {
    if (onBuildUniverse) {
      onBuildUniverse({
        destination: activeTripContext?.destination || 'Japan',
        days: activeTripContext?.days || 10,
        budget: activeTripContext?.budget || 3500,
        interests: activeTripContext?.interests || ['Culture', 'Exploration'],
      });
    }
  };

  return (
    <div
      className={`h-screen w-full flex overflow-hidden font-body ${
        isDark
          ? 'dark bg-[#121212] text-[#F5F5F5] selection:bg-white selection:text-[#1F1E1E]'
          : 'bg-white text-[#1F1E1E] selection:bg-[#1F1E1E] selection:text-white'
      }`}
    >
      {/* 1. Left Sidebar Column */}
      <CreateSidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        width={sidebarWidth}
        onWidthChange={handleSidebarWidthChange}
        onNewChat={handleNewChat}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        currentTrip={activeTripContext}
        onNavigateHome={onNavigateHome}
        onNavigateProfile={onNavigateProfile}
        onNavigateExplore={onNavigateExplore}
        onExploreSpatial={() => setIsSpatialOpen(true)}
      />

      {/* 2. Main Central Chat Column */}
      <ChatWorkspace
        messages={activeMessages}
        onSendMessage={handleSendMessage}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onOpenMobileSidebar={() => setIsSidebarOpen(true)}
        activeChatTitle={activeSession?.title}
        isSpatialOpen={isSpatialOpen}
        onToggleSpatial={() => setIsSpatialOpen(!isSpatialOpen)}
        onSelectPrompt={handleSelectPrompt}
        isLoading={isLoading}
        onResetChat={handleNewChat}
      />

      {/* 3. Right Spatial Workspace Column (Future 3rd column, conditional) */}
      <SpatialWorkspace
        isOpen={isSpatialOpen}
        onClose={() => setIsSpatialOpen(false)}
        trip={activeTripContext}
        onBuildFullUniverse={handleBuildFullUniverse}
      />
    </div>
  );
};
