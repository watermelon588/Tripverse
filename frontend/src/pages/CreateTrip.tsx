import React, { useState, useEffect, useCallback } from 'react';
import { CreateSidebar } from '../components/create/CreateSidebar';
import { ChatWorkspace } from '../components/create/ChatWorkspace';
import { SpatialWorkspace } from '../components/create/SpatialWorkspace';
import { ChatSessionItem } from '../components/create/ChatHistory';
import { ChatMessageItem } from '../components/create/ChatMessage';
import { CurrentTripContext } from '../components/create/CurrentTrip';
import { TripFormData } from '../types/trip';
import { useTheme } from '../context/ThemeContext';
import {
  createTrip,
  listTrips,
  deleteTrip,
  getTripMessages,
  sendTripMessageStream,
  TripModelResponse,
} from '../services/tripService';

interface CreateTripProps {
  onBuildUniverse?: (formData: TripFormData) => void;
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateProfile?: () => void;
  onNavigateLogin?: () => void;
  onNavigateSignup?: () => void;
}

function formatTime(isoString?: string): string {
  if (!isoString) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(new Date());
  }
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(new Date(isoString));
  } catch {
    return 'Just now';
  }
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

// Initial mock conversation sessions for fallback demonstration
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
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [sessions, setSessions] = useState<ChatSessionItem[]>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tripverse-active-session-id') || null;
  });

  const [messagesMap, setMessagesMap] =
    useState<Record<string, ChatMessageItem[]>>(INITIAL_MESSAGES_MAP);
  const [tripContextMap, setTripContextMap] =
    useState<Record<string, CurrentTripContext>>(INITIAL_TRIP_CONTEXT_MAP);

  const [sessionTripIdMap, setSessionTripIdMap] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('tripverse-session-trip-map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

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

  const [isSpatialOpen, setIsSpatialOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load chat messages from backend for a specific trip
  const loadTripMessagesForSession = useCallback(
    async (sessionId: string, tripId: string) => {
      try {
        const apiMsgs = await getTripMessages(tripId);
        if (apiMsgs && apiMsgs.length > 0) {
          const chatMsgs: ChatMessageItem[] = apiMsgs.map((m) => {
            const roleLower = (m.role || '').toLowerCase();
            const isSys = roleLower === 'system';
            const isAst = roleLower === 'assistant';
            return {
              id: m.id,
              sender: isSys ? 'system' : isAst ? 'assistant' : 'user',
              content: m.content,
              timestamp: formatTime(m.created_at),
              stage: m.payload?.stage || (isSys ? 'SYSTEM' : undefined),
              metadata: m.payload?.metadata,
            };
          });

          setMessagesMap((prev) => ({
            ...prev,
            [sessionId]: chatMsgs,
          }));
        }
      } catch (err) {
        console.warn('Could not load messages for trip:', tripId, err);
      }
    },
    []
  );

  // Load user trips on initial mount
  useEffect(() => {
    let isMounted = true;

    async function initUserTrips() {
      try {
        const dbTrips = await listTrips();
        if (!isMounted || !dbTrips || dbTrips.length === 0) return;

        const newMap: Record<string, string> = {};
        const newContextMap: Record<string, CurrentTripContext> = {};

        const dbSessions: ChatSessionItem[] = dbTrips.map((t: TripModelResponse) => {
          const sId = `session-${t.id}`;
          newMap[sId] = t.id;

          if (t.destination || t.duration_days) {
            newContextMap[sId] = {
              title: t.destination ? `${t.destination} Expedition` : 'New Voyage',
              destination: t.destination || 'Unspecified',
              days: t.duration_days || 0,
              budget: 0,
              currency: t.currency || 'USD',
              travelers: 1,
              status: t.onboarding_status === 'COMPLETE' ? 'ROUTING' : 'ONBOARDING',
              interests: ['Exploration', 'Culture'],
            };
          }

          return {
            id: sId,
            title: (t.destination ? `${t.destination} VOYAGE` : 'UNTITLED VOYAGE').toUpperCase(),
            timestamp: formatRelativeTime(t.updated_at || t.created_at),
            preview: t.destination
              ? `${t.duration_days ? `${t.duration_days} days in ` : ''}${t.destination}${
                  t.origin_text ? ` from ${t.origin_text}` : ''
                }`
              : 'Trip planning conversation...',
            messageCount: 0,
            tripContext: {
              destination: t.destination || undefined,
              days: t.duration_days || undefined,
            },
          };
        });

        setSessionTripIdMap((prev) => {
          const merged = { ...prev, ...newMap };
          localStorage.setItem('tripverse-session-trip-map', JSON.stringify(merged));
          return merged;
        });

        setTripContextMap((prev) => ({ ...prev, ...newContextMap }));
        setSessions(dbSessions);

        // If saved active session exists, load its messages
        const savedActive = localStorage.getItem('tripverse-active-session-id');
        if (savedActive && newMap[savedActive]) {
          setActiveSessionId(savedActive);
          loadTripMessagesForSession(savedActive, newMap[savedActive]);
        }
      } catch (err) {
        console.warn('Could not fetch user trips from API:', err);
      }
    }

    initUserTrips();

    return () => {
      isMounted = false;
    };
  }, [loadTripMessagesForSession]);

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

  const activeMessages = activeSessionId ? messagesMap[activeSessionId] || [] : [];
  const activeTripContext = activeSessionId ? tripContextMap[activeSessionId] || null : null;
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // New Chat Handler
  const handleNewChat = () => {
    setActiveSessionId(null);
    localStorage.removeItem('tripverse-active-session-id');
  };

  // Select Session Handler
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    localStorage.setItem('tripverse-active-session-id', id);

    const tripId = sessionTripIdMap[id];
    if (tripId && (!messagesMap[id] || messagesMap[id].length === 0)) {
      loadTripMessagesForSession(id, tripId);
    }
  };

  // Delete Session Handler — Removes locally and deletes from backend database
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Identify backend tripId if mapped
    const mappedTripId = sessionTripIdMap[id];
    const fallbackTripId = id.startsWith('session-') ? id.replace('session-', '') : id;
    const isLikelyUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const backendTripId = (mappedTripId && isLikelyUUID(mappedTripId)) ? mappedTripId : (isLikelyUUID(fallbackTripId) ? fallbackTripId : null);

    // 2. Remove session immediately from UI state for responsive experience
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setMessagesMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTripContextMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSessionTripIdMap((prev) => {
      const next = { ...prev };
      delete next[id];
      localStorage.setItem('tripverse-session-trip-map', JSON.stringify(next));
      return next;
    });

    if (activeSessionId === id) {
      setActiveSessionId(null);
      localStorage.removeItem('tripverse-active-session-id');
    }

    // 3. Delete trip permanently from database
    if (backendTripId) {
      try {
        await deleteTrip(backendTripId);
      } catch (err) {
        console.warn('Could not delete trip on backend:', backendTripId, err);
      }
    }
  };

  // Send Message Handler — Connected to Backend LangGraph Agent via SSE Streaming
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
      localStorage.setItem('tripverse-active-session-id', currentId);
    }

    const timeStr = formatTime();

    const userMessage: ChatMessageItem = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content,
      timestamp: timeStr,
    };

    const assistantMsgId = `ast-${Date.now()}`;

    // Add user message immediately
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
          setSessionTripIdMap((prev) => {
            const updated = { ...prev, [currentId!]: backendTripId };
            localStorage.setItem('tripverse-session-trip-map', JSON.stringify(updated));
            return updated;
          });
        }
      }

      if (!backendTripId) {
        throw new Error('Could not establish backend trip session');
      }

      // 2. Stream message to backend LangGraph agent
      await sendTripMessageStream(backendTripId, content, {
        onToken: (delta: string) => {
          setIsLoading(false); // First token arrived, stop loader spinner
          setMessagesMap((prev) => {
            const list = prev[currentId!] || [];
            const existingIndex = list.findIndex((msg) => msg.id === assistantMsgId);

            if (existingIndex === -1) {
              // First token: create assistant message
              const newAssistantMsg: ChatMessageItem = {
                id: assistantMsgId,
                sender: 'assistant',
                content: delta,
                timestamp: formatTime(),
              };
              return {
                ...prev,
                [currentId!]: [...list, newAssistantMsg],
              };
            }

            // Subsequent tokens: append delta
            return {
              ...prev,
              [currentId!]: list.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: msg.content + delta }
                  : msg
              ),
            };
          });
        },
        onMetadata: (meta) => {
          if (meta.destination || meta.duration_days) {
            setTripContextMap((prev) => ({
              ...prev,
              [currentId!]: {
                title: meta.destination ? `${meta.destination} Expedition` : 'New Voyage',
                destination: meta.destination || 'Unspecified',
                days: meta.duration_days || 0,
                budget: 0,
                currency: 'USD',
                travelers: 1,
                status: meta.onboarding_complete ? 'ROUTING' : 'ONBOARDING',
                interests: ['Exploration', 'Culture'],
              },
            }));

            if (meta.destination) {
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === currentId
                    ? {
                        ...s,
                        title: `${meta.destination} VOYAGE`.toUpperCase(),
                        tripContext: {
                          destination: meta.destination || undefined,
                          days: meta.duration_days || undefined,
                        },
                      }
                    : s
                )
              );
            }
          }
        },
        onDone: (doneData) => {
          setIsLoading(false);
          const trip = doneData.trip;
          const conv = doneData.conversation;

          const extractedMetadata: any = {};
          if (trip.destination) extractedMetadata.destination = trip.destination;
          if (trip.duration_days) extractedMetadata.duration = `${trip.duration_days} Days`;
          if (trip.origin_text) extractedMetadata.origin = trip.origin_text;

          setMessagesMap((prev) => {
            const list = prev[currentId!] || [];
            const exists = list.some((msg) => msg.id === assistantMsgId);
            let updated: ChatMessageItem[];

            if (!exists) {
              const newMsg: ChatMessageItem = {
                id: assistantMsgId,
                sender: 'assistant',
                content: doneData.assistant_message?.content || '',
                timestamp: formatTime(),
                metadata: Object.keys(extractedMetadata).length > 0 ? extractedMetadata : undefined,
              };
              updated = [...list, newMsg];
            } else {
              updated = list.map((msg) => {
                if (msg.id === assistantMsgId) {
                  return {
                    ...msg,
                    content: doneData.assistant_message?.content || msg.content,
                    metadata:
                      Object.keys(extractedMetadata).length > 0 ? extractedMetadata : undefined,
                  };
                }
                return msg;
              });
            }

            // If onboarding complete, add system checkpoint notification
            if (trip.onboarding_status === 'COMPLETE' || conv?.current_stage === 'COMPLETE') {
              const alreadyHasCheckpoint = updated.some(
                (m) => m.stage === 'ONBOARDING CHECKPOINT' && m.sender === 'system'
              );
              if (!alreadyHasCheckpoint) {
                const checkpointMessage: ChatMessageItem = {
                  id: `sys-${Date.now()}`,
                  sender: 'system',
                  content: `Trip parameters captured: ${trip.destination} (${trip.duration_days} Days${
                    trip.origin_text ? `, from ${trip.origin_text}` : ''
                  }). Onboarding complete.`,
                  timestamp: formatTime(),
                  stage: 'ONBOARDING CHECKPOINT',
                };
                updated.push(checkpointMessage);
              }
            }

            return {
              ...prev,
              [currentId!]: updated,
            };
          });

          // Update trip context
          if (trip.destination || trip.duration_days) {
            setTripContextMap((prev) => ({
              ...prev,
              [currentId!]: {
                title: trip.destination ? `${trip.destination} Expedition` : 'New Voyage',
                destination: trip.destination || 'Unspecified',
                days: trip.duration_days || 0,
                budget: 0,
                currency: trip.currency || 'USD',
                travelers: 1,
                status: trip.onboarding_status === 'COMPLETE' ? 'ROUTING' : 'ONBOARDING',
                interests: ['Exploration', 'Culture'],
              },
            }));

            if (trip.destination) {
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === currentId
                    ? {
                        ...s,
                        title: `${trip.destination} VOYAGE`.toUpperCase(),
                        preview: `${trip.duration_days || 0} days in ${trip.destination}`,
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
        },
        onError: (err) => {
          setIsLoading(false);
          console.error('Streaming interaction error:', err);
          const fallbackMessage: ChatMessageItem = {
            id: `sys-err-${Date.now()}`,
            sender: 'system',
            content: `Agent service notice: ${err?.message || 'Connection interrupted'}.`,
            timestamp: formatTime(),
            stage: 'AGENT STATUS',
          };
          setMessagesMap((prev) => ({
            ...prev,
            [currentId!]: [...(prev[currentId!] || []), fallbackMessage],
          }));
        },
      });
    } catch (err: any) {
      console.error('Backend interaction failed:', err);
      setIsLoading(false);

      const fallbackMessage: ChatMessageItem = {
        id: `sys-err-${Date.now()}`,
        sender: 'system',
        content: `Backend response: ${err?.message || 'Agent service busy'}. Message recorded locally.`,
        timestamp: formatTime(),
        stage: 'AGENT STATUS',
      };

      setMessagesMap((prev) => ({
        ...prev,
        [currentId!]: [...(prev[currentId!] || []), fallbackMessage],
      }));
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
