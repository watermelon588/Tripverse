import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { CreateSidebar } from '../components/create/CreateSidebar';
import { ChatWorkspace } from '../components/create/ChatWorkspace';
import type { ChatSessionItem } from '../components/create/ChatHistory';
import type { ChatMessageItem } from '../components/create/ChatMessage';
import type { CurrentTripContext } from '../components/create/CurrentTrip';
import type { CopilotOp, CopilotState } from '../components/create/CopilotPanel';
import type { OnboardingValues } from '../components/create/TripOnboardingForm';
import { graphFromLegacyText, type ItineraryGraph } from '../components/create/itineraryGraph';
import { TripPreviewCard } from '../components/create/TripPreviewCard';
import { TripStudio } from '../components/studio/TripStudio';
import { prefersReducedMotion } from '../components/home/v2/motion';
import { useTheme } from '../context/ThemeContext';
import {
  createTrip, deleteTrip, getItineraryGraph, getTripDocument, getTripMessages, listTrips, sendTripMessageStream,
  type TripDocument, type TripModelResponse,
} from '../services/tripService';

gsap.registerPlugin(Flip);
const BudgetWorkspace = React.lazy(() => import('../components/create/BudgetWorkspace').then((module) => ({ default: module.BudgetWorkspace })));

interface CreateTripProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateProfile?: () => void;
  onNavigateLogin?: () => void;
  onNavigateSignup?: () => void;
}

const sessionId = (tripId: string) => 'session-' + tripId;
/** `/trips/<id>` opens that trip's studio; the studio lives inside the planner. */
const studioTripFromPath = () => window.location.pathname.match(/^\/trips\/([^/]+)\/?$/)?.[1] ?? null;
const timeLabel = (date?: string) =>
  new Date(date || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function tripContext(trip: TripModelResponse): CurrentTripContext {
  return {
    title: trip.destination ? trip.destination + ' Voyage' : 'New voyage',
    destination: trip.destination || undefined,
    origin: trip.origin_text || undefined,
    days: trip.duration_days || undefined,
    status: trip.onboarding_status !== 'COMPLETE' ? 'ONBOARDING' : trip.status === 'DRAFT' ? 'CHOOSING' : 'ROUTING',
  };
}

function sessionItem(trip: TripModelResponse): ChatSessionItem {
  return {
    id: sessionId(trip.id),
    title: (trip.destination ? trip.destination + ' voyage' : 'New voyage').toUpperCase(),
    timestamp: timeLabel(trip.updated_at),
    preview: trip.destination ? String(trip.duration_days || 0) + ' days in ' + trip.destination : 'Journey details needed',
  };
}

export const CreateTrip: React.FC<CreateTripProps> = ({
  onNavigateHome, onNavigateExplore, onNavigateProfile,
}) => {
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessageItem[]>>({});
  const [tripsMap, setTripsMap] = useState<Record<string, TripModelResponse>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState('Preparing your trip');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [studioOpen, setStudioOpen] = useState(() => studioTripFromPath() !== null);
  const [studioDay, setStudioDay] = useState<number | null>(null);
  const [studioDoc, setStudioDoc] = useState<TripDocument | null>(null);
  const studioFlip = useRef<Flip.FlipState | null>(null);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [budgetRevision, setBudgetRevision] = useState(0);
  const [backfilledGraphs, setBackfilledGraphs] = useState<Record<string, ItineraryGraph>>({});
  // Build-with-agent state streamed mid-turn; the saved message takes over once the reply is done.
  const [liveCopilots, setLiveCopilots] = useState<Record<string, CopilotState>>({});
  const attemptedGraphIds = useRef(new Set<string>());

  const loadMessages = useCallback(async (id: string, tripId: string) => {
    const rows = await getTripMessages(tripId);
    setMessagesMap((prev) => ({
      ...prev,
      [id]: rows.map((row) => ({
        id: row.id,
        sender: row.role === 'ASSISTANT' ? 'assistant' : 'user',
        content: row.content || '',
        timestamp: timeLabel(row.created_at),
        payload: row.payload,
      })),
    }));
  }, []);

  const startNewTrip = useCallback(async () => {
    setIsLoading(true);
    try {
      const created = await createTrip();
      if (!created) throw new Error('Could not create a trip');
      const id = sessionId(created.trip_id);
      const trip: TripModelResponse = {
        id: created.trip_id, status: 'DRAFT', onboarding_status: 'IN_PROGRESS',
        places_to_visit: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setTripsMap((prev) => ({ ...prev, [id]: trip }));
      setSessions((prev) => [sessionItem(trip), ...prev]);
      setMessagesMap((prev) => ({
        ...prev,
        [id]: [{
          id: created.assistant_message.id,
          sender: 'assistant',
          content: created.assistant_message.content,
          timestamp: timeLabel(created.assistant_message.created_at),
          payload: created.assistant_message.payload,
        }],
      }));
      setActiveSessionId(id);
      setIsBudgetOpen(false);
      localStorage.setItem('tripverse-active-session-id', id);
      return { id, tripId: created.trip_id };
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const boot = async () => {
      try {
        const trips = await listTrips();
        if (!alive) return;
        if (!trips.length) {
          await startNewTrip();
          return;
        }
        const map = Object.fromEntries(trips.map((trip) => [sessionId(trip.id), trip]));
        setTripsMap(map);
        setSessions(trips.map(sessionItem));
        const saved = localStorage.getItem('tripverse-active-session-id');
        const linked = studioTripFromPath();
        const id = linked && map[sessionId(linked)] ? sessionId(linked)
          : saved && map[saved] ? saved : sessionId(trips[0].id);
        setActiveSessionId(id);
        await loadMessages(id, map[id].id);
      } catch (error) {
        console.error('Could not load trips', error);
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    void boot();
    return () => { alive = false; };
  }, [loadMessages, startNewTrip]);

  const openStudio = (day: number | null = null, push = true) => {
    const tripId = activeSessionId ? tripsMap[activeSessionId]?.id : undefined;
    if (!tripId) return;
    const card = document.querySelector('.tv-chat [data-flip-id="trip-stage"]');
    if (card && !prefersReducedMotion()) studioFlip.current = Flip.getState(card);
    setStudioDay(day);
    setIsBudgetOpen(false);
    setStudioOpen(true);
    if (push && window.location.pathname !== `/trips/${tripId}`) window.history.pushState({ studio: true }, '', `/trips/${tripId}`);
  };

  const closeStudio = (push = true) => {
    const finish = () => {
      setStudioOpen(false);
      if (push) window.history.pushState({}, '', '/create');
    };
    const studio = document.querySelector('.tv-studio');
    if (!studio || prefersReducedMotion()) return finish();
    gsap.to(studio, { opacity: 0, scale: 0.985, duration: 0.28, ease: 'power2.in', onComplete: finish });
  };

  // Back and forward between chat and studio stay inside this page.
  useEffect(() => {
    const onPop = () => {
      if (studioTripFromPath()) openStudio(null, false);
      else if (studioOpen) closeStudio(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  });

  useLayoutEffect(() => {
    const state = studioFlip.current;
    studioFlip.current = null;
    const stage = studioOpen ? document.querySelector('.tv-studio [data-flip-id="trip-stage"]') : null;
    if (!state || !stage) return;
    Flip.from(state, { targets: stage, duration: 0.7, ease: 'power3.inOut', absolute: true, scale: false });
  }, [studioOpen]);

  const selectSession = (id: string) => {
    setActiveSessionId(id);
    localStorage.setItem('tripverse-active-session-id', id);
    if (!messagesMap[id] && tripsMap[id]) {
      void loadMessages(id, tripsMap[id].id);
    }
  };

  const removeSession = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const trip = tripsMap[id];
    if (!trip) return;
    try {
      if (!await deleteTrip(trip.id)) throw new Error('Delete request failed');
      setSessions((prev) => prev.filter((item) => item.id !== id));
      setMessagesMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setTripsMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeSessionId === id) {
        setActiveSessionId(null);
        localStorage.removeItem('tripverse-active-session-id');
      }
    } catch (error) {
      console.error('Could not delete trip', error);
    }
  };

  const sendMessage = async (
    content: string, _attachments?: File[], form?: OnboardingValues,
    uiAction?: Record<string, unknown>,
  ) => {
    if (isLoading) return;
    let id = activeSessionId;
    let tripId = id ? tripsMap[id]?.id : undefined;
    let assistantId = '';
    let pendingTokens = '';
    let tokenFrame = 0;
    const flushTokens = () => {
      tokenFrame = 0;
      const delta = pendingTokens;
      pendingTokens = '';
      if (!delta || !id) return;
      const currentId = id;
      setMessagesMap((prev) => {
        const rows = prev[currentId] || [];
        const found = rows.some((row) => row.id === assistantId);
        return {
          ...prev,
          [currentId]: found
            ? rows.map((row) => row.id === assistantId ? { ...row, content: row.content + delta } : row)
            : [...rows, { id: assistantId, sender: 'assistant', content: delta, timestamp: timeLabel() }],
        };
      });
    };
    try {
      if (!tripId) {
        const created = await startNewTrip();
        id = created.id;
        tripId = created.tripId;
      }
      const currentId = id!;
      assistantId = 'assistant-' + Date.now();
      setMessagesMap((prev) => ({
        ...prev,
        [currentId]: [...(prev[currentId] || []), {
          id: 'user-' + Date.now(), sender: 'user', content, timestamp: timeLabel(),
        }],
      }));
      setIsLoading(true);
      setLoadingStage('Getting your trip ready');
      setBackfilledGraphs((previous) => {
        const next = { ...previous };
        delete next[tripId!];
        return next;
      });
      await sendTripMessageStream(
        tripId, content,
        {
          onGraph: (graph) => {
            setBackfilledGraphs((previous) => ({ ...previous, [tripId!]: graph }));
          },
          onCopilot: (copilot: CopilotState) => {
            setLiveCopilots((previous) => ({ ...previous, [tripId!]: copilot }));
          },
          onStage: (label) => setLoadingStage(label),
          // Tokens arrive far faster than frames; re-render the markdown once per frame.
          onToken: (delta) => {
            pendingTokens += delta;
            if (!tokenFrame) tokenFrame = requestAnimationFrame(flushTokens);
          },
          onDone: (result) => {
            cancelAnimationFrame(tokenFrame);
            tokenFrame = 0;
            pendingTokens = '';
            setBudgetRevision((value) => value + 1);
            setTripsMap((prev) => ({ ...prev, [currentId]: result.trip }));
            setSessions((prev) => prev.map((item) =>
              item.id === currentId ? sessionItem(result.trip) : item,
            ));
            setMessagesMap((prev) => {
              const rows = prev[currentId] || [];
              const message = result.assistant_message;
              if (!message) return prev;
              // Keep the streamed row's id so React updates it in place instead of
              // remounting it (which replayed the entrance animation on the whole itinerary).
              const saved: ChatMessageItem = {
                id: rows.some((row) => row.id === assistantId) ? assistantId : message.id,
                sender: 'assistant', content: message.content,
                timestamp: timeLabel(message.created_at), payload: message.payload,
              };
              return {
                ...prev,
                [currentId]: [...rows.filter((row) => row.id !== assistantId), saved],
              };
            });
          },
        },
        form || uiAction ? 'UI_ACTION' : 'TEXT',
        form ? { action: 'SUBMIT_TRIP_ONBOARDING', ...form }
          // Typed messages in build mode are about the day on screen.
          : uiAction || (activeCopilot ? { copilot_day: copilotDay ?? activeCopilot.current_day } : undefined),
      );
      flushTokens();
    } catch (error) {
      cancelAnimationFrame(tokenFrame);
      tokenFrame = 0;
      pendingTokens = '';
      const currentId = id;
      if (currentId) {
        setMessagesMap((prev) => ({
          ...prev,
          [currentId]: [...(prev[currentId] || []).filter((row) => row.id !== assistantId), {
            id: 'error-' + Date.now(), sender: 'system',
            content: error instanceof Error ? error.message : 'Could not reach the planner. Please try again.',
            timestamp: timeLabel(), stage: 'AGENT STATUS',
          }],
        }));
      }
    } finally {
      setIsLoading(false);
      if (tripId) {
        setLiveCopilots((previous) => {
          const next = { ...previous };
          delete next[tripId!];
          return next;
        });
      }
    }
  };

  const activeMessages = activeSessionId ? messagesMap[activeSessionId] || [] : [];
  const activeTrip = activeSessionId ? tripsMap[activeSessionId] : undefined;
  const latestAssistant = [...activeMessages].reverse().find((message) => message.sender === 'assistant');
  const formMessage = latestAssistant?.payload?.action === 'SHOW_ONBOARDING_FORM' ? latestAssistant : null;
  const onboardingValues = activeTrip?.onboarding_status === 'COMPLETE'
    ? null
    : (formMessage?.payload?.values || {}) as Partial<OnboardingValues>;
  // Build-with-agent state rides on the latest itinerary message it produced.
  const activeCopilot = useMemo(
    () => (activeTrip && liveCopilots[activeTrip.id])
      || [...activeMessages].reverse().find((message) => message.payload?.copilot)?.payload?.copilot || null,
    [activeMessages, activeTrip, liveCopilots],
  );
  // Switching days is local; the agent's own focus takes over again after each reply.
  const [copilotDay, setCopilotDay] = useState<number | null>(null);
  useEffect(() => setCopilotDay(null), [activeCopilot]);
  const showPlanningChoice = activeTrip?.onboarding_status === 'COMPLETE'
    && activeTrip.status === 'DRAFT'
    && activeMessages.some((message) => message.payload?.action === 'SHOW_PLANNING_CHOICE');
  const activeGraph = useMemo((): ItineraryGraph | null => {
    if (activeTrip && backfilledGraphs[activeTrip.id]) return backfilledGraphs[activeTrip.id];
    if (activeTrip?.onboarding_status !== 'COMPLETE' || activeTrip.status === 'DRAFT') return null;
    const saved = [...activeMessages].reverse().find((message) => message.payload?.kind === 'ITINERARY_GRAPH');
    if (saved?.payload?.graph?.nodes && saved.payload.graph.edges) return saved.payload.graph as ItineraryGraph;
    const lastDraft = [...activeMessages].reverse().find((message) => message.sender === 'assistant' && message.content);
    return lastDraft && activeTrip.destination
      ? graphFromLegacyText(lastDraft.content, activeTrip.origin_text, activeTrip.destination, activeTrip.places_to_visit || [])
      : null;
  }, [activeMessages, activeTrip, backfilledGraphs]);

  const planned = Boolean(activeTrip && activeTrip.onboarding_status === 'COMPLETE' && activeTrip.status !== 'DRAFT' && activeGraph);
  useEffect(() => {
    if (studioOpen && !planned && !isLoading && activeTrip) closeStudio();
  }, [studioOpen, planned, isLoading, activeTrip]);
  useEffect(() => {
    if (!studioOpen || !activeTrip || isLoading) return;
    let alive = true;
    void getTripDocument(activeTrip.id).then((doc) => { if (alive) setStudioDoc(doc); })
      .catch((error) => console.warn('Could not load the trip document', error));
    return () => { alive = false; };
  }, [studioOpen, activeTrip?.id, isLoading, budgetRevision, activeMessages.length]);
  useEffect(() => { setStudioDay(null); }, [activeTrip?.id]);

  useEffect(() => {
    if (!studioOpen || !activeTrip || activeTrip.onboarding_status !== 'COMPLETE' || activeTrip.status === 'DRAFT' || !activeMessages.length) return;
    if (activeMessages.some((message) => message.payload?.kind === 'ITINERARY_GRAPH' && (message.payload.graph?.version || 0) >= 8)) return;
    if (attemptedGraphIds.current.has(activeTrip.id)) return;
    attemptedGraphIds.current.add(activeTrip.id);
    void getItineraryGraph(activeTrip.id)
      .then((graph) => setBackfilledGraphs((previous) => ({ ...previous, [activeTrip.id]: graph })))
      .catch((error) => console.warn('Could not backfill itinerary graph', error));
  }, [activeMessages, activeTrip, studioOpen]);

  const chatProps = {
    messages: activeMessages,
    onSendMessage: sendMessage,
    isSidebarOpen,
    onToggleSidebar: () => setIsSidebarOpen((open) => !open),
    onOpenMobileSidebar: () => setIsSidebarOpen(true),
    activeChatTitle: sessions.find((item) => item.id === activeSessionId)?.title,
    isBudgetOpen,
    onToggleBudget: () => setIsBudgetOpen((open) => !open),
    onSelectPrompt: (prompt: string) => { void sendMessage(prompt); },
    isLoading,
    loadingStage,
    onResetChat: () => { void startNewTrip(); },
    onboardingValues: formMessage ? onboardingValues : null,
    showComposer: !formMessage && !showPlanningChoice,
    showPlanningChoice,
    planningBrief: showPlanningChoice && activeTrip ? {
      origin: activeTrip.origin_text || '',
      destination: activeTrip.destination || '',
      duration_days: activeTrip.duration_days || undefined,
      places_to_visit: activeTrip.places_to_visit || [],
      planning_preferences: {
        ...activeTrip.planning_preferences,
        pace: activeTrip.planning_preferences?.pace || 'balanced',
        interests: activeTrip.planning_preferences?.interests || [],
        avoid: activeTrip.planning_preferences?.avoid || [],
      },
      currency: activeTrip.currency as OnboardingValues['currency'],
    } : null,
    onGenerateFull: () => { void sendMessage('Generate the full itinerary', undefined, undefined, { action: 'GENERATE_FULL_ITINERARY' }); },
    onStartBuild: () => { void sendMessage("Let's build it day by day together", undefined, undefined, { action: 'START_BUILD_WITH_AGENT' }); },
    copilot: activeCopilot,
    copilotDay: activeCopilot ? copilotDay ?? activeCopilot.current_day : null,
    onCopilotDay: setCopilotDay,
    onCopilotOps: (ops: CopilotOp[], label: string, day: number) => { void sendMessage(label, undefined, undefined, { action: 'COPILOT_OPS', ops, copilot_day: day }); },
    onSubmitOnboarding: (values: OnboardingValues) => {
      const summary = values.origin + ' to ' + values.destination + ' for ' + values.duration_days + ' days'
        + (values.places_to_visit.length ? ', visiting ' + values.places_to_visit.join(', ') : '');
      void sendMessage(summary, undefined, values);
    },
  };

  // "Add to day N" from Around here. Build-with-the-agent trips take a structured add (budget and day
  // checks run in the engine); one-shot plans get the same request as a chat message, which revises the draft.
  const addPlace = (name: string, day: number | null) => {
    if (activeCopilot) {
      const target = day ?? copilotDay ?? activeCopilot.current_day;
      void sendMessage(`Add ${name} to day ${target}`, undefined, undefined,
        { action: 'COPILOT_OPS', ops: [{ op: 'add', name, day: target }], copilot_day: target });
    } else {
      void sendMessage(day ? `Please add ${name} to day ${day}.` : `Please add ${name} to the plan.`);
    }
  };

  return (
    <div className={'tv2 tv2-app tv-create ' + (theme === 'dark' ? 'is-dark dark' : '') + (studioOpen ? ' is-studio' : '')}>
      <CreateSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        onNewChat={() => { void startNewTrip(); }}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onDeleteSession={removeSession}
        currentTrip={activeTrip ? tripContext(activeTrip) : null}
        onNavigateHome={onNavigateHome}
        onNavigateProfile={onNavigateProfile}
        onNavigateExplore={onNavigateExplore}
        onExploreSpatial={() => openStudio()}
      />
      <ChatWorkspace
        key={activeSessionId || 'new-trip'}
        {...chatProps}
        onOpenStudio={planned ? () => openStudio() : undefined}
        tripPreview={planned && activeTrip && activeGraph ? (
          <TripPreviewCard tripId={activeTrip.id} destination={activeTrip.destination}
            days={activeTrip.duration_days} startDate={activeTrip.planning_preferences?.start_date}
            guideId={activeTrip.planning_preferences?.guide} graph={activeGraph} onOpen={(day) => openStudio(day ?? null)} />
        ) : null}
      />
      {studioOpen && planned && activeTrip && (
        <TripStudio trip={activeTrip} tripContext={tripContext(activeTrip)} graph={activeGraph}
          document={studioDoc?.trip_id === activeTrip.id ? studioDoc : null} dark={theme === 'dark'}
          isLoading={isLoading} loadingStage={loadingStage} day={studioDay} onSelectDay={setStudioDay}
          onBack={() => closeStudio()} onOpenBudget={() => setIsBudgetOpen(true)}
          onAddPlace={isLoading ? undefined : addPlace}
          chat={<ChatWorkspace key={`drawer-${activeSessionId}`} {...chatProps} variant="drawer" />} />
      )}
      {isBudgetOpen && activeTrip && <React.Suspense fallback={null}>
        <BudgetWorkspace tripId={activeTrip.id} destination={activeTrip.destination} graph={activeGraph}
          refreshVersion={budgetRevision} onClose={() => setIsBudgetOpen(false)} />
      </React.Suspense>}
    </div>
  );
};
