import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { cmtheme, language } from "../../src/atoms";
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from "firebase/auth";
import ACTIONS from "../actions/Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import CopyCodeButton from "../components/CopyCodeButton";
import { auth } from "../firebase";
import { initSocket } from "../socket";

const createDefaultRoomState = () => ({
  ownerUsername: "",
  latestCode: "",
  problem: {
    title: "",
    statement: "",
    targetTimeComplexity: "",
    targetSpaceComplexity: "",
    timeLimitMs: 2000,
    memoryLimitKb: 131072,
    visibleTestCasesText: "",
    hiddenTestCasesText: "",
  },
  timer: {
    durationSeconds: 1800,
    startedAt: null,
  },
  submissions: [],
});

const mergeRoomState = (currentState, updates = {}) => ({
  ...currentState,
  ...updates,
  problem: {
    ...currentState.problem,
    ...(updates.problem || {}),
  },
  timer: {
    ...currentState.timer,
    ...(updates.timer || {}),
  },
  submissions: updates.submissions || currentState.submissions,
});

const formatTestCases = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return "";
  }

  return JSON.stringify(value, null, 2);
};

const parseTestCasesText = (value, label) => {
  if (!value || !value.trim()) {
    return [];
  }

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON array.`);
  }

  return parsed.map((item) => ({
    input: item?.input ?? "",
    output: item?.output ?? "",
  }));
};

const formatTimestamp = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString();
};

const parseExecutionTimeMs = (value) => {
  if (!value || value === "N/A") {
    return null;
  }

  const matched = `${value}`.match(/([0-9]+(?:\.[0-9]+)?)s/i);
  if (!matched) {
    return null;
  }

  return Math.round(Number(matched[1]) * 1000);
};

const parseMemoryKb = (value) => {
  if (!value || value === "N/A") {
    return null;
  }

  const matched = `${value}`.match(/([0-9]+(?:\.[0-9]+)?)\s*KB/i);
  if (!matched) {
    return null;
  }

  return Math.round(Number(matched[1]));
};

const voiceRtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const buildLineDiffRows = (primaryText = "", secondaryText = "") => {
  const primaryLines = `${primaryText}`.split("\n");
  const secondaryLines = `${secondaryText}`.split("\n");
  const total = Math.max(primaryLines.length, secondaryLines.length, 1);

  return Array.from({ length: total }, (_, index) => {
    const text = primaryLines[index] ?? "";
    const compare = secondaryLines[index] ?? "";
    return {
      key: `line-${index}`,
      text,
      changed: text !== compare,
    };
  });
};

const buildSparklinePoints = (values = [], width = 120, height = 30) => {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(maxValue - minValue, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = Math.round(index * stepX * 100) / 100;
      const y = Math.round((height - ((value - minValue) / range) * height) * 100) / 100;
      return `${x},${y}`;
    })
    .join(" ");
};

const sampleProblemTemplate = {
  title: "Two Sum of Two Inputs",
  statement:
    "Read two integers and print their sum. Solve it within the expected complexity.",
  targetTimeComplexity: "O(1)",
  targetSpaceComplexity: "O(1)",
  timeLimitMs: 2000,
  memoryLimitKb: 131072,
  timerDurationSeconds: 1800,
  visibleTestCases: [
    {
      input: "2\n3",
      output: "5",
    },
  ],
  hiddenTestCases: [
    {
      input: "100\n250",
      output: "350",
    },
  ],
};

const backendBaseUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const USERNAME_PREF_STORAGE_KEY = "sync-code-username-pref";


const detectClientOs = () => {
  const platform = `${navigator.platform || ""}`.toLowerCase();
  const userAgent = `${navigator.userAgent || ""}`.toLowerCase();

  if (platform.includes("mac") || userAgent.includes("mac os")) {
    return "macos";
  }
  if (platform.includes("win") || userAgent.includes("windows")) {
    return "windows";
  }
  return "linux";
};

const EditorPage = () => {
  const [lang, setLang] = useRecoilState(language);
  const [, setCmTheme] = useRecoilState(cmtheme);
  const [clients, setClients] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runOutput, setRunOutput] = useState("Run your code to see output here.");
  const [editorSnapshot, setEditorSnapshot] = useState("");
  const [roomState, setRoomState] = useState(createDefaultRoomState());
  const [clockTick, setClockTick] = useState(Date.now());
  const [problemLibrary, setProblemLibrary] = useState([]);
  const [selectedLibraryProblemId, setSelectedLibraryProblemId] = useState("");
  const [isLoadingLibraryProblem, setIsLoadingLibraryProblem] = useState(false);

  const [personalPreviewProblem, setPersonalPreviewProblem] = useState(null);
  const [isLoadingPersonalPreview, setIsLoadingPersonalPreview] = useState(false);
  const [switchRequests, setSwitchRequests] = useState([]);
  const [pendingSwitchRequest, setPendingSwitchRequest] = useState(null);
  const [previewWindowState, setPreviewWindowState] = useState({
    x: Math.max((window.innerWidth || 1200) * 0.58, 640),
    y: 90,
    width: Math.min((window.innerWidth || 1200) * 0.34, 500),
    height: Math.min((window.innerHeight || 800) * 0.72, 620),
  });
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const [complexityHint, setComplexityHint] = useState(null);
  const [outputPanelHeight, setOutputPanelHeight] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 900) {
      return 220;
    }
    return 280;
  });
  const [isResizingOutput, setIsResizingOutput] = useState(false);
  const [executionMeta, setExecutionMeta] = useState({ time: "-", memory: "-" });
  const [runState, setRunState] = useState("idle");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState(null);
  const [runtimeStatusByLanguage, setRuntimeStatusByLanguage] = useState({});
  const [runtimeInstallOs, setRuntimeInstallOs] = useState("auto");
  const [launchProblemHandled, setLaunchProblemHandled] = useState(false);
  const [hintHistory, setHintHistory] = useState([]);
  const [hintPenalty, setHintPenalty] = useState(0);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [lastRunResults, setLastRunResults] = useState([]);

  const [outputPanelTab, setOutputPanelTab] = useState("output");
  const [activeLeftTab, setActiveLeftTab] = useState("description");
  const [activeToolModal, setActiveToolModal] = useState(null);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [problemSearchQuery, setProblemSearchQuery] = useState("");
  const [problemCategoryFilter, setProblemCategoryFilter] = useState("all");

  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [submissionFilterStatus, setSubmissionFilterStatus] = useState("all");
  const [submissionFilterLanguage, setSubmissionFilterLanguage] = useState("all");
  const [nextRecommendedProblem, setNextRecommendedProblem] = useState(null);
  const [isLoadingNextRecommendation, setIsLoadingNextRecommendation] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState([]);
  const [whiteboardColor, setWhiteboardColor] = useState("#8B5CF6");
  const [whiteboardBrushSize, setWhiteboardBrushSize] = useState(2);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceStatusLabel, setVoiceStatusLabel] = useState("Voice off");
  const [editorTheme, setEditorTheme] = useState(() => `${localStorage.getItem("editor-ui-theme") || "midnight"}`);
  const [customStdinInput, setCustomStdinInput] = useState("");
  const [customStdinExpected, setCustomStdinExpected] = useState("");
  const [editorUsername, setEditorUsername] = useState(() => {
    try {
      return `${localStorage.getItem(USERNAME_PREF_STORAGE_KEY) || ""}`.trim();
    } catch (_error) {
      return "";
    }
  });

  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const problemInputRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const editorSplitRef = useRef(null);
  const profileMenuRef = useRef(null);
  const runCodeShortcutRef = useRef(null);
  const whiteboardCanvasRef = useRef(null);
  const drawingStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);
  const localVoiceStreamRef = useRef(null);
  const voicePeersRef = useRef({});
  const voiceAudioRefs = useRef({});
  const voiceEnabledRef = useRef(false);
  const previewDragOriginRef = useRef({ x: 0, y: 0 });
  const previewResizeOriginRef = useRef({ x: 0, y: 0, width: 500, height: 620 });
  const location = useLocation();
  const { roomId } = useParams();
  const isReadOnlyView = location.pathname.startsWith("/room/") && location.pathname.endsWith("/view");
  const isRoomMode = Boolean(roomId);
  const isSoloMode = !isRoomMode;
  const reactNavigator = useNavigate();
  const spectatorUsername = useMemo(() => `Spectator-${Math.random().toString(36).slice(2, 7)}`, []);
  const sessionUsername = `${location.state?.username || location.state?.profile?.displayName || (isReadOnlyView ? spectatorUsername : "Solo User")}`.trim() || "Solo User";
  const profileName = isSoloMode ? (editorUsername || sessionUsername) : sessionUsername;
  const profileContact = location.state?.profile?.email || location.state?.profile?.phoneNumber || (isReadOnlyView ? "Read-only viewer" : "Authenticated");
  const activeUsername = `${isRoomMode ? sessionUsername : (editorUsername || sessionUsername)}`.trim() || "Solo User";
  const isExecuting = isRunning || isSubmitting;
  const submitAttempts = useMemo(
    () => (roomState.submissions || []).filter((submission) => submission?.attemptType === "submit"),
    [roomState.submissions]
  );

  const submissionLanguages = useMemo(
    () => ["all", ...new Set(submitAttempts.map((submission) => submission.language).filter(Boolean))],
    [submitAttempts]
  );

  const solvedCount = useMemo(
    () => new Set(submitAttempts.filter((s) => s.passed).map((s) => s.problemId || s.title || "unknown")).size,
    [submitAttempts]
  );

  const filteredSubmitAttempts = useMemo(() => {
    return submitAttempts.filter((submission) => {
      const statusMatched =
        submissionFilterStatus === "all" ||
        (submissionFilterStatus === "accepted" && submission.passed) ||
        (submissionFilterStatus === "failed" && !submission.passed);
      const languageMatched = submissionFilterLanguage === "all" || submission.language === submissionFilterLanguage;
      return statusMatched && languageMatched;
    });
  }, [submissionFilterLanguage, submissionFilterStatus, submitAttempts]);

  const performanceTrend = useMemo(() => {
    const recent = submitAttempts.slice(0, 5);
    if (recent.length === 0) {
      return null;
    }

    const passedCount = recent.filter((item) => item.passed).length;
    const passRate = Math.round((passedCount / recent.length) * 100);
    const timeValues = recent.map((item) => Number(item.executionTimeMs || 0)).filter((value) => value > 0);
    const memoryValues = recent.map((item) => Number(item.memoryKb || 0)).filter((value) => value > 0);
    const latest = recent[0];
    const previous = recent[1];
    let momentum = "stable";

    if (previous) {
      if (latest.passed && !previous.passed) {
        momentum = "up";
      } else if (!latest.passed && previous.passed) {
        momentum = "down";
      }
    }

    return {
      attempts: recent.length,
      passRate,
      avgTimeMs: timeValues.length > 0 ? Math.round(timeValues.reduce((sum, value) => sum + value, 0) / timeValues.length) : null,
      avgMemoryKb: memoryValues.length > 0 ? Math.round(memoryValues.reduce((sum, value) => sum + value, 0) / memoryValues.length) : null,
      momentum,
    };
  }, [submitAttempts]);

  const latestPerformancePoints = useMemo(() => {
    const latestTen = [...submitAttempts].slice(0, 10).reverse();
    return {
      time: latestTen.map((item) => Number(item.executionTimeMs || 0)).filter((value) => value > 0),
      memory: latestTen.map((item) => Number(item.memoryKb || 0)).filter((value) => value > 0),
    };
  }, [submitAttempts]);

  useEffect(() => {
    const editorThemeMap = {
      midnight: "material-darker",
      neon: "dracula",
      light: "3024-day",
      sepia: "mdn-like",
    };

    setCmTheme(editorThemeMap[editorTheme] || "material-darker");
    localStorage.setItem("editor-ui-theme", editorTheme);
  }, [editorTheme, setCmTheme]);

  useEffect(() => {
    if (!showWhiteboard || !whiteboardCanvasRef.current) {
      return;
    }

    const canvas = whiteboardCanvasRef.current;
    const context = canvas.getContext("2d");
    const pixelRatio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, rect.width, rect.height);
    context.lineCap = "round";
    context.lineJoin = "round";

    whiteboardStrokes.forEach((stroke) => {
      if (!stroke?.points || stroke.points.length < 2) {
        return;
      }

      context.beginPath();
      context.strokeStyle = stroke.color || "#8B5CF6";
      context.lineWidth = stroke.size || 2;
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach((point) => {
        context.lineTo(point.x, point.y);
      });
      context.stroke();
    });
  }, [showWhiteboard, whiteboardStrokes]);

  useEffect(() => {
    const handleViewportResize = () => {
      if (window.innerWidth <= 900) {
        setOutputPanelHeight((prevHeight) => Math.min(prevHeight, 240));
      }
    };

    handleViewportResize();
    window.addEventListener("resize", handleViewportResize);

    return () => {
      window.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  const getCanvasPoint = useCallback((event) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const handleWhiteboardPointerDown = useCallback((event) => {
    if (isReadOnlyView) {
      return;
    }

    const initialStroke = {
      color: whiteboardColor,
      size: whiteboardBrushSize,
      points: [getCanvasPoint(event)],
    };

    isDrawingRef.current = true;
    drawingStrokeRef.current = initialStroke;
    setWhiteboardStrokes((prev) => [...prev, initialStroke]);
  }, [getCanvasPoint, isReadOnlyView, whiteboardBrushSize, whiteboardColor]);

  const handleWhiteboardPointerMove = useCallback((event) => {
    if (!isDrawingRef.current || !drawingStrokeRef.current) {
      return;
    }

    drawingStrokeRef.current.points.push(getCanvasPoint(event));
    setWhiteboardStrokes((prev) => [...prev.slice(0, -1), drawingStrokeRef.current]);
  }, [getCanvasPoint]);

  const handleWhiteboardPointerUp = useCallback(() => {
    if (!isDrawingRef.current || !drawingStrokeRef.current) {
      return;
    }

    isDrawingRef.current = false;
    drawingStrokeRef.current = null;

    if (isRoomMode) {
      socketRef.current?.emit(ACTIONS.WHITEBOARD_SYNC, {
        roomId,
        strokes: whiteboardStrokes,
      });
    }
  }, [isRoomMode, roomId, whiteboardStrokes]);

  const handleWhiteboardClear = useCallback(() => {
    if (isReadOnlyView) {
      return;
    }

    setWhiteboardStrokes([]);
    if (isRoomMode) {
      socketRef.current?.emit(ACTIONS.WHITEBOARD_CLEAR, { roomId });
    }
  }, [isReadOnlyView, isRoomMode, roomId]);

  const cleanupVoicePeer = useCallback((socketId) => {
    if (!socketId) {
      return;
    }

    const peer = voicePeersRef.current[socketId];
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      try {
        peer.close();
      } catch (_error) {
      }
      delete voicePeersRef.current[socketId];
    }

    const audioElement = voiceAudioRefs.current[socketId];
    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.srcObject = null;
        audioElement.remove();
      } catch (_error) {
      }
      delete voiceAudioRefs.current[socketId];
    }
  }, []);

  const cleanupVoiceSession = useCallback(() => {
    Object.keys(voicePeersRef.current).forEach((socketId) => cleanupVoicePeer(socketId));

    if (localVoiceStreamRef.current) {
      localVoiceStreamRef.current.getTracks().forEach((track) => track.stop());
      localVoiceStreamRef.current = null;
    }
  }, [cleanupVoicePeer]);

  const ensureVoicePeer = useCallback((targetSocketId) => {
    if (!targetSocketId) {
      return null;
    }

    const existingPeer = voicePeersRef.current[targetSocketId];
    if (existingPeer) {
      return existingPeer;
    }

    const peer = new RTCPeerConnection(voiceRtcConfig);

    if (localVoiceStreamRef.current) {
      localVoiceStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localVoiceStreamRef.current);
      });
    }

    peer.onicecandidate = (event) => {
      if (!event.candidate || !isRoomMode) {
        return;
      }

      socketRef.current?.emit(ACTIONS.VOICE_SIGNAL, {
        toSocketId: targetSocketId,
        signal: {
          type: "ice-candidate",
          candidate: event.candidate,
          roomId,
        },
      });
    };

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams || [];
      if (!remoteStream) {
        return;
      }

      let audioElement = voiceAudioRefs.current[targetSocketId];
      if (!audioElement) {
        audioElement = document.createElement("audio");
        audioElement.autoplay = true;
        audioElement.playsInline = true;
        audioElement.dataset.peer = targetSocketId;
        voiceAudioRefs.current[targetSocketId] = audioElement;
        document.body.appendChild(audioElement);
      }

      audioElement.srcObject = remoteStream;
      audioElement
        .play()
        .catch(() => {
        });
    };

    peer.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(peer.connectionState)) {
        cleanupVoicePeer(targetSocketId);
      }
    };

    voicePeersRef.current[targetSocketId] = peer;
    return peer;
  }, [cleanupVoicePeer, isRoomMode, roomId]);

  const createVoiceOffer = useCallback(async (targetSocketId) => {
    if (!targetSocketId || !isRoomMode || !voiceEnabled) {
      return;
    }

    const peer = ensureVoicePeer(targetSocketId);
    if (!peer) {
      return;
    }

    const offer = await peer.createOffer({ offerToReceiveAudio: true });
    await peer.setLocalDescription(offer);

    socketRef.current?.emit(ACTIONS.VOICE_SIGNAL, {
      toSocketId: targetSocketId,
      signal: {
        type: "offer",
        sdp: offer,
        roomId,
      },
    });
  }, [ensureVoicePeer, isRoomMode, roomId, voiceEnabled]);

  const toggleVoiceSession = useCallback(async () => {
    if (!isRoomMode) {
      toast("Voice chat is available in rooms only.", { icon: "ℹ️" });
      return;
    }

    if (isReadOnlyView) {
      toast("Read-only spectators cannot join voice.", { icon: "ℹ️" });
      return;
    }

    if (voiceEnabled) {
      socketRef.current?.emit(ACTIONS.VOICE_STATUS, { roomId, enabled: false });
      Object.keys(voicePeersRef.current).forEach((socketId) => {
        socketRef.current?.emit(ACTIONS.VOICE_SIGNAL, {
          toSocketId: socketId,
          signal: { type: "hangup", roomId },
        });
      });
      cleanupVoiceSession();
      setVoiceEnabled(false);
      setVoiceStatusLabel("Voice off");
      toast.success("Voice chat disabled.");
      return;
    }

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localVoiceStreamRef.current = localStream;
      setVoiceEnabled(true);
      setVoiceStatusLabel("Voice on");
      socketRef.current?.emit(ACTIONS.VOICE_STATUS, { roomId, enabled: true });

      const currentSocketId = socketRef.current?.id;
      clients
        .filter((client) => client.socketId !== currentSocketId)
        .forEach((client) => {
          createVoiceOffer(client.socketId).catch(() => {
          });
        });

      toast.success("Voice chat enabled.");
    } catch (_error) {
      setVoiceEnabled(false);
      setVoiceStatusLabel("Mic blocked");
      toast.error("Microphone permission denied or unavailable.");
    }
  }, [cleanupVoiceSession, clients, createVoiceOffer, isReadOnlyView, isRoomMode, roomId, voiceEnabled]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    return () => {
      cleanupVoiceSession();
    };
  }, [cleanupVoiceSession]);

  const currentVerdict = useMemo(() => {
    if (runState === "running") {
      return isSubmitting ? "SUBMITTING" : "RUNNING";
    }

    if (runState === "success") {
      if (lastRunResults.length > 0 && lastRunResults.every((result) => result.passed)) {
        return "ACCEPTED";
      }
      return "ACCEPTED";
    }

    if (runState === "error") {
      const fullOutput = [
        runOutput,
        ...(lastRunResults || []).map((result) => `${result.actual || ""} ${result.expected || ""}`),
      ]
        .join(" ")
        .toLowerCase();

      if (/time\s*limit|timed\s*out|timeout|tle/.test(fullOutput)) {
        return "TLE";
      }

      if (/runtime|exception|traceback|segmentation|stack\s*overflow|syntaxerror|referenceerror|typeerror/.test(fullOutput)) {
        return "RUNTIME_ERROR";
      }

      if (lastRunResults.length > 0) {
        return "WRONG_ANSWER";
      }

      return "RUNTIME_ERROR";
    }

    return "NONE";
  }, [isSubmitting, lastRunResults, runOutput, runState]);

  const activeResult =
    lastRunResults.length > 0
      ? lastRunResults[Math.min(activeResultIndex, lastRunResults.length - 1)]
      : null;

  const activeResultDiff = useMemo(() => {
    if (!activeResult || activeResult.visibility !== "visible") {
      return null;
    }

    return {
      expectedRows: buildLineDiffRows(activeResult.expected || "", activeResult.actual || ""),
      actualRows: buildLineDiffRows(activeResult.actual || "", activeResult.expected || ""),
    };
  }, [activeResult]);

  const loadNextRecommendation = useCallback(async () => {
    const username = `${activeUsername || ""}`.trim();
    if (!username) {
      toast.error("Username is missing. Unable to load recommendations.");
      return;
    }

    setIsLoadingNextRecommendation(true);
    try {
      const params = new URLSearchParams({ username });
      const response = await fetch(`${backendBaseUrl}/api/recommendations?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to fetch recommendations.");
      }

      const currentId = roomState.problem?.id || selectedLibraryProblemId || "";
      const groups = Array.isArray(payload?.recommendations) ? payload.recommendations : [];
      let nextProblem = null;

      for (const group of groups) {
        const candidate = (group?.problems || []).find((problem) => problem?.id && problem.id !== currentId);
        if (candidate) {
          nextProblem = {
            ...candidate,
            topic: group?.topic || candidate.category,
          };
          break;
        }
      }

      if (!nextProblem) {
        const fallbackResponse = await fetch(`${backendBaseUrl}/api/problems?page=1&limit=20`);
        const fallbackPayload = await fallbackResponse.json();
        if (fallbackResponse.ok) {
          const fallbackProblems = Array.isArray(fallbackPayload?.problems) ? fallbackPayload.problems : [];
          const fallbackCandidate = fallbackProblems.find((problem) => problem?.id && problem.id !== currentId);
          if (fallbackCandidate) {
            nextProblem = {
              ...fallbackCandidate,
              topic: fallbackCandidate.category || "recommended",
            };
          }
        }
      }

      setNextRecommendedProblem(nextProblem);
      if (!nextProblem) {
        toast("No next recommendation available right now.", { icon: "ℹ️" });
      }
    } catch (_error) {
      setNextRecommendedProblem(null);
      toast.error("Failed to load recommendations.");
    } finally {
      setIsLoadingNextRecommendation(false);
    }
  }, [activeUsername, roomState.problem?.id, selectedLibraryProblemId]);

  const applyIncomingRoomState = (incomingState) => {
    if (typeof incomingState?.latestCode === "string") {
      codeRef.current = incomingState.latestCode;
      editorInstanceRef.current?.setCode(incomingState.latestCode);
    }

    setRoomState((prev) =>
      mergeRoomState(prev, {
        ...incomingState,
        problem: {
          ...(incomingState?.problem || {}),
          hiddenTestCasesText: prev.problem.hiddenTestCasesText,
        },
      })
    );
  };

  useEffect(() => {
    if (typeof roomState.latestCode === "string" && editorInstanceRef.current) {
      editorInstanceRef.current.setCode(roomState.latestCode);
      codeRef.current = roomState.latestCode;
    }
  }, [roomState.latestCode]);

  const updateRoomState = useCallback((updates, shouldBroadcast = true) => {
    setRoomState((prev) => {
      const nextState = mergeRoomState(prev, updates);
      if (shouldBroadcast && isRoomMode && roomId) {
        socketRef.current?.emit(ACTIONS.ROOM_STATE_UPDATE, {
          roomId,
          updates,
        });
      }
      return nextState;
    });
  }, [isRoomMode, roomId]);

  useEffect(() => {
    const timerId = setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!isResizingOutput) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      const splitRect = editorSplitRef.current?.getBoundingClientRect();
      if (!splitRect) {
        return;
      }

      const nextHeight = splitRect.bottom - event.clientY;
      const safeHeight = Math.min(Math.max(nextHeight, 140), 420);
      setOutputPanelHeight(safeHeight);
    };

    const handleMouseUp = () => {
      setIsResizingOutput(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingOutput]);

  useEffect(() => {
    if (!isDraggingPreview && !isResizingPreview) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      if (isDraggingPreview) {
        setPreviewWindowState((prev) => ({
          ...prev,
          x: Math.max(12, event.clientX - previewDragOriginRef.current.x),
          y: Math.max(70, event.clientY - previewDragOriginRef.current.y),
        }));
        return;
      }

      if (isResizingPreview) {
        const nextWidth = Math.min(
          Math.max(360, previewResizeOriginRef.current.width + (event.clientX - previewResizeOriginRef.current.x)),
          Math.max(440, (window.innerWidth || 1200) * 0.46)
        );
        const nextHeight = Math.min(
          Math.max(360, previewResizeOriginRef.current.height + (event.clientY - previewResizeOriginRef.current.y)),
          Math.max(460, (window.innerHeight || 800) * 0.86)
        );
        setPreviewWindowState((prev) => ({
          ...prev,
          width: nextWidth,
          height: nextHeight,
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPreview(false);
      setIsResizingPreview(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPreview, isResizingPreview]);

  useEffect(() => {
    document.body.classList.remove("theme-ocean", "theme-cyber");
    document.body.classList.add("theme-cyber");
    localStorage.setItem("ui-theme", "cyber");
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    const handleDocumentClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    const loadProblemLibrary = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/api/problems`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch problem library.");
        }

        setProblemLibrary(Array.isArray(data?.problems) ? data.problems : []);
      } catch (error) {
        toast.error(error.message || "Failed to fetch problem library.");
      }
    };

    loadProblemLibrary();
  }, []);

  useEffect(() => {
    const loadRuntimeStatus = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/api/runtime-status`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch runtime status.");
        }

        setRuntimeStatusByLanguage(data?.languageStatus || {});
      } catch (error) {
      }
    };

    loadRuntimeStatus();
  }, []);

  useEffect(() => {
    if (!isRoomMode) {
      return () => {};
    }

    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", handleErrors);
      socketRef.current.on("connect_failed", handleErrors);

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: activeUsername,
      });

      socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId, roomState }) => {
        if (username !== activeUsername) {
          toast.success(`${username} joined the room.`);
        }

        setClients(clients);
        if (roomState) {
          applyIncomingRoomState(roomState);
        }

        socketRef.current.emit(ACTIONS.SYNC_CODE, {
          code: codeRef.current,
          socketId,
        });
      });

      socketRef.current.on(ACTIONS.ROOM_STATE_UPDATE, ({ roomState }) => {
        if (roomState) {
          applyIncomingRoomState(roomState);
        }
      });

      socketRef.current.on(ACTIONS.PRESENCE_UPDATE, ({ clients }) => {
        setClients(Array.isArray(clients) ? clients : []);
      });

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        cleanupVoicePeer(socketId);
      });

      socketRef.current.on(ACTIONS.JOIN_REJECTED, ({ reason }) => {
        toast.error(reason || "Unable to join room.");
        reactNavigator("/");
      });

      socketRef.current.on(ACTIONS.PROBLEM_SWITCH_REQUESTED, (request) => {
        setSwitchRequests((prev) => [request, ...prev].slice(0, 20));
        toast.success(`${request.requesterName} requested: ${request.title || request.problemId}`);
      });

      socketRef.current.on(ACTIONS.PROBLEM_SWITCH_RESPONSE, ({ decision, title }) => {
        if (decision === "pending") {
          toast("Switch request already pending approval.", { icon: "⏳" });
          return;
        }

        setPendingSwitchRequest(null);

        if (decision === "approved") {
          toast.success(`Host approved your switch request: ${title || "selected problem"}`);
          return;
        }
        toast.error(`Host rejected your switch request: ${title || "selected problem"}`);
      });

      socketRef.current.on(ACTIONS.WHITEBOARD_SYNC, ({ strokes }) => {
        setWhiteboardStrokes(Array.isArray(strokes) ? strokes : []);
      });

      socketRef.current.on(ACTIONS.WHITEBOARD_CLEAR, () => {
        setWhiteboardStrokes([]);
      });

      socketRef.current.on(ACTIONS.VOICE_SIGNAL, async ({ fromSocketId, signal }) => {
        if (!fromSocketId || !signal || fromSocketId === socketRef.current?.id) {
          return;
        }

        if (signal.type === "hangup") {
          cleanupVoicePeer(fromSocketId);
          return;
        }

        if (signal.type === "offer") {
          if (!voiceEnabledRef.current) {
            return;
          }

          try {
            const peer = ensureVoicePeer(fromSocketId);
            if (!peer) {
              return;
            }

            await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            socketRef.current?.emit(ACTIONS.VOICE_SIGNAL, {
              toSocketId: fromSocketId,
              signal: {
                type: "answer",
                sdp: answer,
                roomId,
              },
            });
          } catch (_error) {
            cleanupVoicePeer(fromSocketId);
          }
          return;
        }

        if (signal.type === "answer") {
          const peer = voicePeersRef.current[fromSocketId];
          if (!peer) {
            return;
          }

          try {
            await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } catch (_error) {
            cleanupVoicePeer(fromSocketId);
          }
          return;
        }

        if (signal.type === "ice-candidate") {
          const peer = voicePeersRef.current[fromSocketId];
          if (!peer || !signal.candidate) {
            return;
          }

          try {
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (_error) {
          }
        }
      });
    };

    const handleErrors = (error) => {
      console.error("socket error", error);
      toast.error("Socket connection failed, try again later.");
      reactNavigator("/");
    };

    init();

    return () => {
      socketRef.current?.off(ACTIONS.JOINED);
      socketRef.current?.off(ACTIONS.ROOM_STATE_UPDATE);
      socketRef.current?.off(ACTIONS.PRESENCE_UPDATE);
      socketRef.current?.off(ACTIONS.DISCONNECTED);
      socketRef.current?.off(ACTIONS.JOIN_REJECTED);
      socketRef.current?.off(ACTIONS.PROBLEM_SWITCH_REQUESTED);
      socketRef.current?.off(ACTIONS.PROBLEM_SWITCH_RESPONSE);
      socketRef.current?.off(ACTIONS.WHITEBOARD_SYNC);
      socketRef.current?.off(ACTIONS.WHITEBOARD_CLEAR);
      socketRef.current?.off(ACTIONS.VOICE_SIGNAL);
      socketRef.current?.emit(ACTIONS.VOICE_STATUS, { roomId, enabled: false });
      cleanupVoiceSession();
      socketRef.current?.disconnect();
    };
  }, [
    activeUsername,
    cleanupVoicePeer,
    cleanupVoiceSession,
    ensureVoicePeer,
    isRoomMode,
    reactNavigator,
    roomId,
  ]);

  const remainingSeconds = useMemo(() => {
    const { durationSeconds, startedAt } = roomState.timer;
    if (!startedAt) {
      return durationSeconds;
    }

    const elapsedSeconds = Math.floor((clockTick - startedAt) / 1000);
    return Math.max(durationSeconds - elapsedSeconds, 0);
  }, [clockTick, roomState.timer]);

  const selectedRuntimeStatus = runtimeStatusByLanguage?.[lang] || null;
  const runtimeBadgeInfo = useMemo(() => {
    if (!selectedRuntimeStatus) {
      return {
        tone: "runtimeStatusNeutral",
        label: "Runtime status unavailable for this editor mode.",
      };
    }

    if (selectedRuntimeStatus.mode === "local") {
      if (selectedRuntimeStatus.localAvailable) {
        return {
          tone: "runtimeStatusOk",
          label: `Local runtime ready (${selectedRuntimeStatus.executionLanguage})`,
        };
      }

      return {
        tone: "runtimeStatusError",
        label: `Missing local runtime: ${selectedRuntimeStatus.missingBinaries.join(", ")}`,
      };
    }

    if (selectedRuntimeStatus.localAvailable) {
      return {
        tone: "runtimeStatusOk",
        label: `Local fallback ready (${selectedRuntimeStatus.executionLanguage})`,
      };
    }

    return {
      tone: "runtimeStatusWarn",
      label: `Remote execution mode. Missing local: ${selectedRuntimeStatus.missingBinaries.join(", ")}`,
    };
  }, [selectedRuntimeStatus]);

  const runtimeInstallCommands = useMemo(() => {
    if (!selectedRuntimeStatus?.missingBinaries?.length) {
      return [];
    }

    const osCommands = {};

    const commands = selectedRuntimeStatus.missingBinaries
      .map((binaryName) => osCommands[binaryName])
      .filter(Boolean);

    return [...new Set(commands)];
  }, [selectedRuntimeStatus]);

  const runtimeInstallOsLabel = useMemo(() => {
    const detectedOs = detectClientOs();
    const selectedOsKey = runtimeInstallOs === "auto" ? detectedOs : runtimeInstallOs;
    if (selectedOsKey === "macos") return "macOS";
    if (selectedOsKey === "windows") return "Windows";
    return "Linux";
  }, [runtimeInstallOs]);

  const runtimeInstallAutoLabel = useMemo(() => {
    const detectedOs = detectClientOs();
    if (detectedOs === "macos") return "Auto (Detected: macOS)";
    if (detectedOs === "windows") return "Auto (Detected: Windows)";
    return "Auto (Detected: Linux)";
  }, []);

  const formattedRemainingTime = useMemo(() => {
    const minutes = `${Math.floor(remainingSeconds / 60)}`.padStart(2, "0");
    const seconds = `${remainingSeconds % 60}`.padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);

  const isRoomCreator = isRoomMode && roomState.ownerUsername === activeUsername;
  const canEditProblem = (isSoloMode || isRoomCreator) && !isReadOnlyView;
  const editorThemeClass =
    editorTheme === "neon"
      ? "editorThemeNeon"
      : editorTheme === "light"
      ? "editorThemeLight"
      : editorTheme === "sepia"
      ? "editorThemeSepia"
      : "editorThemeMidnight";
  const readOnlyShareUrl = isRoomMode ? `${window.location.origin}/room/${roomId}/view` : "";
  const currentSocketId = socketRef.current?.id;
  const typingUsers = clients.filter((client) => client.isTyping && client.socketId !== currentSocketId);
  const voiceParticipants = clients.filter((client) => client.voiceEnabled);
  const voiceParticipantLabel =
    voiceParticipants.length <= 1
      ? voiceEnabled
        ? "Voice: just you"
        : "Voice off"
      : `Voice: ${voiceParticipants.length} live`;
  const typingLabel =
    typingUsers.length === 0
      ? ""
      : typingUsers.length === 1
      ? `${typingUsers[0].username} is typing...`
      : `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`;

  useEffect(() => {
    if (!voiceEnabled || !isRoomMode) {
      return;
    }

    const mySocketId = socketRef.current?.id;
    clients
      .filter((client) => client.socketId !== mySocketId && client.voiceEnabled)
      .forEach((client) => {
        if (!voicePeersRef.current[client.socketId]) {
          createVoiceOffer(client.socketId).catch(() => {
          });
        }
      });
  }, [clients, createVoiceOffer, isRoomMode, voiceEnabled]);

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to clipboard");
    } catch (err) {
      toast.error("Could not copy the Room ID");
    }
  }

  function leaveRoom() {
    reactNavigator("/");
  }

  const handleCreateRoomFromSolo = async () => {
    if (!isSoloMode) {
      return;
    }

    const nextRoomId = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      const response = await fetch(`${backendBaseUrl}/api/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: nextRoomId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create room.");
      }

      toast.success("Room created. You are now in collaboration mode.");
      reactNavigator(`/editor/${nextRoomId}`, {
        state: {
          username: activeUsername,
          profile: location.state?.profile || {
            uid: `solo-${activeUsername}`,
            displayName: activeUsername,
            email: "",
            phoneNumber: "",
            photoURL: "",
          },
          selectedProblemId: selectedLibraryProblemId || roomState.problem?.id || undefined,
          selectedProblemTitle: roomState.problem?.title || undefined,
        },
      });
    } catch (error) {
      toast.error(error.message || "Failed to create room.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsProfileMenuOpen(false);
      reactNavigator("/");
    } catch (error) {
      toast.error(error.message || "Failed to logout.");
    }
  };

  const handleSaveEditorUsername = () => {
    if (isRoomMode) {
      toast("Username is fixed for active room sessions.", { icon: "ℹ️" });
      return;
    }

    const normalized = `${editorUsername || ""}`.trim();
    if (!normalized) {
      toast.error("Username cannot be empty.");
      return;
    }

    try {
      localStorage.setItem(USERNAME_PREF_STORAGE_KEY, normalized);
      toast.success("Username saved.");
    } catch (_error) {
      toast.error("Failed to save username.");
    }
  };

  const handleChangePassword = async () => {
    const email = `${location.state?.profile?.email || ""}`.trim().toLowerCase();

    if (!email) {
      toast.error("Email account required to change password.");
      return;
    }

    if (!oldPassword || !newPassword) {
      toast.error("Old and new password are required.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (oldPassword === newPassword) {
      toast.error("New password must be different from old password.");
      return;
    }

    setIsChangingPassword(true);
    try {
      if (auth?.currentUser && auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(email, oldPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
      } else {
        const response = await fetch(`${backendBaseUrl}/api/auth/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, oldPassword, newPassword }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to change password.");
        }
      }

      setOldPassword("");
      setNewPassword("");
      setShowChangePassword(false);
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCopyOutput = async () => {
    if (!runOutput) {
      toast.error("Output is empty.");
      return;
    }

    try {
      await navigator.clipboard.writeText(runOutput);
      toast.success("Output copied.");
    } catch (error) {
      toast.error("Failed to copy output.");
    }
  };

  const handleCopyInstallCommand = async (command) => {
    if (!command) {
      return;
    }

    try {
      await navigator.clipboard.writeText(command);
      toast.success("Install command copied.");
    } catch (error) {
      toast.error("Failed to copy command.");
    }
  };

  const handleClearOutput = () => {
    setRunOutput("Run your code to see output here.");
    setExecutionMeta({ time: "-", memory: "-" });
    setRunState("idle");
    setLastRunResults([]);
    setOutputPanelTab("output");
    setActiveResultIndex(0);
    
  };

  const currentProblemId = useMemo(() => {
    if (roomState.problem?.id) {
      return roomState.problem.id;
    }

    const normalizedTitle = `${roomState.problem?.title || "untitled-problem"}`
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return normalizedTitle || "untitled-problem";
  }, [roomState.problem?.id, roomState.problem?.title]);

  useEffect(() => {
    setNextRecommendedProblem(null);
  }, [currentProblemId]);


  const handleRevealNextHint = async () => {
    const username = activeUsername;
    if (!username) {
      toast.error("Sign in to use hints.");
      return;
    }

    setIsLoadingHint(true);
    try {
      const response = await fetch(`${backendBaseUrl}/api/problem-hints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: roomId || `solo-${activeUsername}`,
          code: codeRef.current || "",
          revealedCount: hintHistory.length,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch hint.");
      }

      if (data?.done) {
        toast("All hints already revealed.", { icon: "🧠" });
        return;
      }

      if (data?.nextHint) {
        setHintHistory((prev) => [...prev, data.nextHint]);
      }
      setHintPenalty(Number(data?.suggestedPenalty) || hintPenalty);
    } catch (error) {
      toast.error(error.message || "Failed to reveal hint.");
    } finally {
      setIsLoadingHint(false);
    }
  };


  const handleFocusEditor = useCallback(() => {
    editorInstanceRef.current?.focus?.();
  }, []);

  const updateEditorCode = useCallback((newCode) => {
    editorInstanceRef.current?.setCode(newCode);
    codeRef.current = newCode;
    if (isRoomMode && roomId) {
      socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: newCode,
      });
    }
  }, [isRoomMode, roomId]);

  const draftStorageKey = useMemo(() => {
    const identity = activeUsername || location.state?.profile?.uid || "member";
    return `sync-code:draft:${roomId || "solo"}:${identity}`;
  }, [activeUsername, location.state?.profile?.uid, roomId]);

  const handleSaveDraft = useCallback((showToast = true) => {
    try {
      const payload = {
        code: codeRef.current || "",
        language: lang,
        savedAt: Date.now(),
      };

      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      setLastDraftSavedAt(payload.savedAt);

      if (showToast) {
        toast.success("Draft saved.");
      }
    } catch (error) {
      if (showToast) {
        toast.error("Failed to save draft.");
      }
    }
  }, [draftStorageKey, lang]);

  const handleRestoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) {
        toast.error("No saved draft found.");
        return;
      }

      const draft = JSON.parse(raw);

      if (typeof draft.code === "string") {
        updateEditorCode(draft.code);
        setEditorSnapshot(draft.code);
      }

      if (typeof draft.language === "string" && draft.language) {
        setLang(draft.language);
      }

      setLastDraftSavedAt(typeof draft.savedAt === "number" ? draft.savedAt : Date.now());
      toast.success("Draft restored.");
    } catch (error) {
      toast.error("Draft is corrupted or unavailable.");
    }
  }, [draftStorageKey, setLang, updateEditorCode]);

  useEffect(() => {
    const raw = localStorage.getItem(draftStorageKey);
    if (!raw) {
      return;
    }

    try {
      const draft = JSON.parse(raw);
      if (typeof draft.savedAt === "number") {
        setLastDraftSavedAt(draft.savedAt);
      }
    } catch (error) {
      setLastDraftSavedAt(null);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    const autosaveTimer = setTimeout(() => {
      handleSaveDraft(false);
    }, 1400);

    return () => clearTimeout(autosaveTimer);
  }, [editorSnapshot, handleSaveDraft]);

  const handleProblemUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const parsed = JSON.parse(loadEvent.target?.result || "{}");
        if (isRoomMode && isRoomCreator) {
          socketRef.current?.emit(ACTIONS.HOST_SET_PROBLEM, {
            roomId,
            problemId: parsed.id || `uploaded-${Date.now()}`,
            title: parsed.title || "",
            description: parsed.statement || "",
            testCases: {
              visible: parsed.visibleTestCases || [],
              hidden: parsed.hiddenTestCases || [],
            },
            problem: parsed,
          });
          setSelectedLibraryProblemId(parsed.id || "");
          toast.success("Structured problem uploaded to shared room.");
        } else if (isSoloMode) {
          setSelectedLibraryProblemId(parsed.id || "");
          setRoomState((prev) =>
            mergeRoomState(prev, {
              problem: {
                id: parsed.id || prev.problem.id,
                title: parsed.title || prev.problem.title,
                statement: parsed.statement || prev.problem.statement,
                targetTimeComplexity: parsed.targetTimeComplexity || prev.problem.targetTimeComplexity,
                targetSpaceComplexity: parsed.targetSpaceComplexity || prev.problem.targetSpaceComplexity,
                timeLimitMs: Number(parsed.timeLimitMs) || prev.problem.timeLimitMs,
                memoryLimitKb: Number(parsed.memoryLimitKb) || prev.problem.memoryLimitKb,
                visibleTestCasesText: JSON.stringify(parsed.visibleTestCases || [], null, 2),
                hiddenTestCasesText: JSON.stringify(parsed.hiddenTestCases || [], null, 2),
              },
              timer: {
                ...prev.timer,
                durationSeconds: Number(parsed.timerDurationSeconds) || prev.timer.durationSeconds,
                startedAt: null,
              },
            })
          );
          toast.success("Problem uploaded for solo practice.");
        } else {
          setPersonalPreviewProblem({
            id: parsed.id || `uploaded-preview-${Date.now()}`,
            title: parsed.title || "Uploaded Problem",
            statement: parsed.statement || "",
            difficulty: parsed.difficulty || "medium",
            category: parsed.category || "other",
            targetTimeComplexity: parsed.targetTimeComplexity || "",
            visibleTestCases: Array.isArray(parsed.visibleTestCases) ? parsed.visibleTestCases : [],
          });
          toast.success("Uploaded JSON opened in your private preview.");
        }
      } catch (error) {
        toast.error("Problem JSON is invalid.");
      } finally {
        if (problemInputRef.current) {
          problemInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(sampleProblemTemplate, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample-problem-template.json";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Sample problem template downloaded.");
  };

  const handleDownloadCode = () => {
    const codeContent = codeRef.current || "";
    if (!codeContent.trim()) {
      toast.error("Code is empty. Nothing to download!");
      return;
    }
    const blob = new Blob([codeContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Pick file extension based on language
    const extMap = {
      cpp: "cpp", java: "java", javascript: "js", python: "py", php: "php",
      go: "go", r: "r", rust: "rs", ruby: "rb", bash: "sh", swift: "swift"
    };
    const ext = extMap[lang] || "txt";
    
    link.download = `sync-code-snippet.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Code downloaded successfully!");
  };

  
  const handlePrevProblemInLibrary = () => {
    if (!problemLibrary || problemLibrary.length === 0) return;
    const currIdx = problemLibrary.findIndex(p => p.id === selectedLibraryProblemId || p.title === roomState.problem.title);
    const prevIdx = currIdx > 0 ? currIdx - 1 : problemLibrary.length - 1;
    const target = problemLibrary[prevIdx];
    if (target) {
      handleLoadProblemFromLibrary(target.id);
    }
  };

  const handleNextProblemInLibrary = () => {
    if (!problemLibrary || problemLibrary.length === 0) return;
    const currIdx = problemLibrary.findIndex(p => p.id === selectedLibraryProblemId || p.title === roomState.problem.title);
    const nextIdx = (currIdx >= 0 && currIdx < problemLibrary.length - 1) ? currIdx + 1 : 0;
    const target = problemLibrary[nextIdx];
    if (target) {
      handleLoadProblemFromLibrary(target.id);
    }
  };

  const handleRandomProblemInLibrary = () => {
    if (!problemLibrary || problemLibrary.length === 0) return;
    const randomIdx = Math.floor(Math.random() * problemLibrary.length);
    const target = problemLibrary[randomIdx];
    if (target) {
      handleLoadProblemFromLibrary(target.id);
    }
  };

  const handleLoadProblemFromLibrary = useCallback(async (problemId) => {
    const targetId = problemId || selectedLibraryProblemId;

    if (isRoomMode && !isRoomCreator) {
      toast.error("Only the room creator can load a shared problem from library.");
      return false;
    }

    if (!targetId) {
      toast.error("Select a library problem first.");
      return false;
    }

    setIsLoadingLibraryProblem(true);

    try {
      const response = await fetch(`${backendBaseUrl}/api/problems/${targetId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load selected problem.");
      }

      const selectedProblem = data?.problem;
      if (!selectedProblem) {
        throw new Error("Selected problem data is unavailable.");
      }

      setSelectedLibraryProblemId(targetId);

      setRoomState((prev) =>
        mergeRoomState(prev, {
          problem: {
            id: targetId,
            title: selectedProblem.title || "",
            statement: selectedProblem.statement || "",
            targetTimeComplexity: selectedProblem.targetTimeComplexity || "",
            targetSpaceComplexity: selectedProblem.targetSpaceComplexity || "",
            timeLimitMs: Number(selectedProblem.timeLimitMs) || prev.problem.timeLimitMs,
            memoryLimitKb: Number(selectedProblem.memoryLimitKb) || prev.problem.memoryLimitKb,
            visibleTestCasesText: JSON.stringify(selectedProblem.visibleTestCases || [], null, 2),
            hiddenTestCasesText: JSON.stringify(selectedProblem.hiddenTestCases || [], null, 2),
          },
          timer: {
            ...prev.timer,
            durationSeconds: Number(selectedProblem.timerDurationSeconds) || prev.timer.durationSeconds,
            startedAt: null,
          },
        })
      );

      if (isRoomMode) {
        socketRef.current?.emit(ACTIONS.HOST_SET_PROBLEM, {
          roomId,
          problemId: targetId,
          title: selectedProblem.title || "",
          description: selectedProblem.statement || "",
          testCases: {
            visible: selectedProblem.visibleTestCases || [],
            hidden: selectedProblem.hiddenTestCases || [],
          },
          problem: selectedProblem,
        });
      }

      toast.success(isRoomMode ? `"${selectedProblem.title}" loaded from library.` : `"${selectedProblem.title}" loaded for solo practice.`);
      return true;
    } catch (error) {
      toast.error(error.message || "Failed to load selected problem.");
      return false;
    } finally {
      setIsLoadingLibraryProblem(false);
    }
  }, [isRoomCreator, isRoomMode, roomId, selectedLibraryProblemId]);

  useEffect(() => {
    const launchProblemId = location.state?.selectedProblemId;
    if (!launchProblemId || launchProblemHandled || !canEditProblem) {
      return;
    }

    setLaunchProblemHandled(true);
    setSelectedLibraryProblemId(launchProblemId);

    handleLoadProblemFromLibrary(launchProblemId).then((loaded) => {
      if (loaded) {
        toast.success(`Question ready: ${location.state?.selectedProblemTitle || launchProblemId}`);
      }
    });
  }, [
    canEditProblem,
    handleLoadProblemFromLibrary,
    launchProblemHandled,
    location.state?.selectedProblemId,
    location.state?.selectedProblemTitle,
  ]);

  const updateProblemField = useCallback((field, value) => {
    if (!canEditProblem) {
      return;
    }

    updateRoomState({
      problem: {
        [field]: value,
      },
    });
  }, [canEditProblem, updateRoomState]);

  const visibleTestCaseItems = useMemo(() => {
    try {
      return parseTestCasesText(roomState.problem.visibleTestCasesText, "Visible test cases");
    } catch (_error) {
      return [];
    }
  }, [roomState.problem.visibleTestCasesText]);

  const setVisibleTestCasesFromItems = useCallback((items = []) => {
    const sanitized = items.map((item) => ({
      input: `${item?.input ?? ""}`,
      output: `${item?.output ?? ""}`,
    }));
    updateProblemField("visibleTestCasesText", JSON.stringify(sanitized, null, 2));
  }, [updateProblemField]);

  const handleAddVisibleTestCase = useCallback(() => {
    if (!canEditProblem) {
      return;
    }

    setVisibleTestCasesFromItems([...visibleTestCaseItems, { input: "", output: "" }]);
  }, [canEditProblem, setVisibleTestCasesFromItems, visibleTestCaseItems]);

  const handleUpdateVisibleTestCase = useCallback((index, field, value) => {
    if (!canEditProblem) {
      return;
    }

    const updated = visibleTestCaseItems.map((item, caseIndex) =>
      caseIndex === index ? { ...item, [field]: value } : item
    );
    setVisibleTestCasesFromItems(updated);
  }, [canEditProblem, setVisibleTestCasesFromItems, visibleTestCaseItems]);

  const handleRemoveVisibleTestCase = useCallback((index) => {
    if (!canEditProblem) {
      return;
    }

    const updated = visibleTestCaseItems.filter((_, caseIndex) => caseIndex !== index);
    setVisibleTestCasesFromItems(updated);
  }, [canEditProblem, setVisibleTestCasesFromItems, visibleTestCaseItems]);

  const handleJudgeCode = useCallback(async (mode = "run", options = {}) => {
    const currentCode = codeRef.current || "";
    if (!currentCode.trim()) {
      toast.error(`Write some code before ${mode === "submit" ? "submitting" : "running"}.`);
      return;
    }

    let visibleTestCases = [];
    let hiddenTestCases = [];

    try {
      visibleTestCases = Array.isArray(options.visibleTestCases)
        ? options.visibleTestCases
        : parseTestCasesText(roomState.problem.visibleTestCasesText, "Visible test cases");
      if (mode === "submit") {
        hiddenTestCases = Array.isArray(options.hiddenTestCases)
          ? options.hiddenTestCases
          : parseTestCasesText(roomState.problem.hiddenTestCasesText, "Hidden test cases");
      }
    } catch (error) {
      toast.error(error.message);
      setRunOutput(error.message);
      return;
    }

    if (mode === "submit") {
      setIsSubmitting(true);
      setRunOutput("Submitting to judge...");
    } else {
      setIsRunning(true);
      setRunOutput("Running sample test cases...");
    }
    setOutputPanelTab("output");
    setActiveResultIndex(0);
    setRunState("running");

    try {
      const response = await fetch(
        `${backendBaseUrl}/api/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: roomId || `solo-${activeUsername}`,
            username: activeUsername,
            language: lang,
            code: currentCode,
            visibleTestCases,
            hiddenTestCases: mode === "submit" ? hiddenTestCases : [],
            timeLimitMs: roomState.problem.timeLimitMs,
            memoryLimitKb: roomState.problem.memoryLimitKb,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to run code.");
      }

      if (Array.isArray(data?.results) && data.results.length > 0) {
        setLastRunResults(data.results);
        const firstFailureIndex = data.results.findIndex((item) => !item.passed);
        setActiveResultIndex(firstFailureIndex >= 0 ? firstFailureIndex : 0);
        const resultSummary = data.results
          .map((item) => {
            if (item.visibility === "hidden") {
              return `Hidden testcase #${item.index}: ${item.passed ? "PASS" : "FAIL"}`;
            }

            return [
              `${mode === "submit" ? "Visible testcase" : "Sample testcase"} #${item.index}: ${item.passed ? "PASS" : "FAIL"}`,
              `Expected: ${item.expected}`,
              `Actual: ${item.actual}`,
            ].join("\n");
          })
          .join("\n\n");

        setRunOutput(resultSummary);

        if (mode === "submit") {
          const submission = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            username: activeUsername,
            language: lang,
            attemptType: "submit",
            passed: data.allPassed,
            passedCount: data.results.filter((item) => item.passed).length,
            totalCount: data.results.length,
            executionTimeMs: parseExecutionTimeMs(data?.executionMeta?.time),
            memoryKb: parseMemoryKb(data?.executionMeta?.memory),
            createdAt: new Date().toISOString(),
          };

          if (isRoomMode) {
            socketRef.current?.emit(ACTIONS.SUBMISSION_ADD, {
              roomId,
              submission,
            });
          } else {
            setRoomState((prev) =>
              mergeRoomState(prev, {
                submissions: [submission, ...(prev.submissions || [])],
              })
            );
          }
        }

        if (data.allPassed) {
          setRunState("success");
          toast.success(mode === "submit" ? "Accepted. All judge cases passed." : "Sample test cases passed.");
          
          if (mode === "submit") {
            loadNextRecommendation();
          }
        } else {
          setRunState("error");
          toast.error(mode === "submit" ? "Submission failed on judge cases." : "Sample test cases failed.");
          if (mode === "submit" && data?.debug) {
            
          } else if (mode === "submit") {
            
          }
        }
      } else {
        setRunState("success");
        setRunOutput(data?.output || "No output.");
        setLastRunResults([]);
        setActiveResultIndex(0);
      }

      if (data?.complexityHint) {
        setComplexityHint(data.complexityHint);
      }

      setExecutionMeta({
        time: data?.executionMeta?.time || "-",
        memory: data?.executionMeta?.memory || "-",
      });
    } catch (error) {
      setRunState("error");
      setRunOutput(error.message || `Failed to ${mode}.`);
      toast.error(error.message || `Failed to ${mode}.`);
    } finally {
      if (mode === "submit") {
        setIsSubmitting(false);
      } else {
        setIsRunning(false);
      }
    }
  }, [
    
    lang,
    loadNextRecommendation,
    activeUsername,
    isRoomMode,
    roomId,
    roomState.problem.hiddenTestCasesText,
    roomState.problem.memoryLimitKb,
    roomState.problem.timeLimitMs,
    roomState.problem.visibleTestCasesText,
  ]);

  const handleRunCode = useCallback(() => handleJudgeCode("run"), [handleJudgeCode]);

  const handleSubmitCode = useCallback(() => handleJudgeCode("submit"), [handleJudgeCode]);

  const handleRunWithCustomStdin = useCallback(() => {
    if (!customStdinInput.trim()) {
      toast.error("Enter custom input before running.");
      return;
    }

    handleJudgeCode("run", {
      visibleTestCases: [
        {
          input: customStdinInput,
          output: customStdinExpected,
        },
      ],
    });
  }, [customStdinExpected, customStdinInput, handleJudgeCode]);

  runCodeShortcutRef.current = handleRunCode;

  useEffect(() => {
    const handleKeydown = (event) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {


        if (personalPreviewProblem) {
          setPersonalPreviewProblem(null);
          return;
        }

        if (isProfileMenuOpen) {
          setIsProfileMenuOpen(false);
        }
      }

      const eventTarget = event.target;
      const isTypingTarget =
        eventTarget instanceof HTMLElement &&
        (eventTarget.closest(".CodeMirror") || ["INPUT", "TEXTAREA", "SELECT"].includes(eventTarget.tagName));

      if (!isTypingTarget && outputPanelTab === "output" && lastRunResults.length > 0) {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          setActiveResultIndex((prev) => Math.min(prev + 1, lastRunResults.length - 1));
          return;
        }

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          setActiveResultIndex((prev) => Math.max(prev - 1, 0));
          return;
        }
      }

      if (isModifierPressed && event.key === "Enter") {
        event.preventDefault();
        runCodeShortcutRef.current?.();
        return;
      }

      if (isModifierPressed && event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        handleSubmitCode();
        return;
      }



      if (isModifierPressed && event.key.toLowerCase() === "e") {
        event.preventDefault();
        handleFocusEditor();
        return;
      }

      if (isModifierPressed && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSaveDraft(true);
        return;
      }

      if (isModifierPressed && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        handleRestoreDraft();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [
    handleFocusEditor,
    handleSubmitCode,
    isProfileMenuOpen,
    lastRunResults.length,
    outputPanelTab,
    personalPreviewProblem,
    handleSaveDraft,
    handleRestoreDraft,
  ]);

  const isTimerRunning = Boolean(roomState.timer.startedAt) && remainingSeconds > 0;

  const handleTimerStart = () => {
    if (!isRoomCreator) {
      toast.error("Only the room creator can manage the timer.");
      return;
    }
    // Pass only the changed field — mergeRoomState preserves the rest
    updateRoomState({ timer: { startedAt: Date.now() } });
  };

  const handleTimerReset = () => {
    if (!isRoomCreator) {
      toast.error("Only the room creator can manage the timer.");
      return;
    }
    updateRoomState({ timer: { startedAt: null } });
    toast("Timer reset.");
  };

  const handleOpenPersonalPreview = useCallback(async (problemId) => {
    if (!problemId) {
      return;
    }

    setIsLoadingPersonalPreview(true);
    try {
      const response = await fetch(`${backendBaseUrl}/api/problems/${problemId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch selected problem.");
      }

      setSelectedLibraryProblemId(problemId);
      setPersonalPreviewProblem(data?.problem || null);
    } catch (error) {
      toast.error(error.message || "Failed to open personal preview.");
    } finally {
      setIsLoadingPersonalPreview(false);
    }
  }, []);

  const handleOpenRecommendedProblem = useCallback(async () => {
    if (!nextRecommendedProblem?.id) {
      return;
    }

    if (isSoloMode || isRoomCreator) {
      const loaded = await handleLoadProblemFromLibrary(nextRecommendedProblem.id);
      if (loaded) {
        toast.success(`Next challenge loaded: ${nextRecommendedProblem.title}`);
      }
      return;
    }

    await handleOpenPersonalPreview(nextRecommendedProblem.id);
    toast.success("Recommended problem opened in personal preview.");
  }, [handleLoadProblemFromLibrary, handleOpenPersonalPreview, isRoomCreator, isSoloMode, nextRecommendedProblem]);

  const handleRequestHostSwitch = () => {
    if (!personalPreviewProblem?.id) {
      toast.error("Select a preview problem first.");
      return;
    }

    if (pendingSwitchRequest) {
      toast("You already have a pending request with the host.", { icon: "⏳" });
      return;
    }

    const nextPendingRequest = {
      problemId: personalPreviewProblem.id,
      title: personalPreviewProblem.title,
      createdAt: Date.now(),
    };

    setPendingSwitchRequest(nextPendingRequest);

    socketRef.current?.emit(ACTIONS.PROBLEM_REQUEST_SWITCH, {
      roomId,
      problemId: personalPreviewProblem.id,
      requesterName: activeUsername,
      title: personalPreviewProblem.title,
    });
    toast.success("Request sent to host.");
  };

  const handleApproveSwitchRequest = async (request) => {
    if (!request?.requestId) {
      return;
    }

    const switched = await handleLoadProblemFromLibrary(request.problemId);
    if (!switched) {
      return;
    }
    socketRef.current?.emit(ACTIONS.PROBLEM_SWITCH_RESPONSE, {
      requestId: request.requestId,
      decision: "approved",
    });
    setSwitchRequests((prev) => prev.filter((item) => item.requestId !== request.requestId));
  };

  const handleRejectSwitchRequest = (requestId) => {
    if (!requestId) {
      return;
    }
    socketRef.current?.emit(ACTIONS.PROBLEM_SWITCH_RESPONSE, {
      requestId,
      decision: "rejected",
    });
    setSwitchRequests((prev) => prev.filter((item) => item.requestId !== requestId));
  };

  const handlePreviewDragStart = (event) => {
    previewDragOriginRef.current = {
      x: event.clientX - previewWindowState.x,
      y: event.clientY - previewWindowState.y,
    };
    setIsDraggingPreview(true);
  };

  const handlePreviewResizeStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    previewResizeOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      width: previewWindowState.width,
      height: previewWindowState.height,
    };
    setIsResizingPreview(true);
  };

  if (isRoomMode && !location.state && !isReadOnlyView) {
    return <Navigate to="/" />;
  }

  return (
    <div className="leetcodeWorkspace flex flex-col h-screen w-screen overflow-hidden bg-[#181818] text-white">
      {/* 1. LEETCODE TOP NAVIGATION BAR */}
      <header className="leetcodeTopBar flex items-center justify-between px-4 py-2 border-b border-[#2d2d2d] bg-[#1c1c1c] z-50 select-none">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 font-bold hover:opacity-90 transition group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-900/40">
              <svg className="h-4 w-4 text-slate-950 font-bold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5" />
                <path d="M8 21H3v-5" />
                <path d="M21 3L14 10" />
                <path d="M3 21l7-7" />
              </svg>
            </div>
            <span className="hidden sm:inline text-sm font-extrabold text-white tracking-wide group-hover:text-emerald-400 transition">
              SYNC <span className="text-emerald-400">CODE</span>
            </span>
          </a>

          <div className="h-4 w-[1px] bg-[#333333] mx-1" />

          <button
            type="button"
            onClick={() => setActiveToolModal("problemList")}
            className="flex items-center gap-2 rounded-lg bg-[#282828] hover:bg-[#333333] px-3 py-1.5 text-xs font-semibold transition text-gray-200 border border-[#3e3e3e]"
          >
            <span className="text-emerald-400">📋</span>
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{roomState.problem.title || "Problem List"}</span>
            <span className="text-[10px] text-gray-400 bg-[#1a1a1a] px-1.5 py-0.5 rounded">500</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevProblemInLibrary}
              className="p-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] text-gray-300 text-xs transition border border-[#3e3e3e]"
              title="Previous Problem"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={handleNextProblemInLibrary}
              className="p-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] text-gray-300 text-xs transition border border-[#3e3e3e]"
              title="Next Problem"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={handleRandomProblemInLibrary}
              className="p-1.5 rounded-lg bg-[#282828] hover:bg-[#333333] text-gray-300 text-xs transition border border-[#3e3e3e]"
              title="Random Problem"
            >
              🔀
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isExecuting || isReadOnlyView}
            className="flex items-center gap-2 rounded-lg bg-[#282828] hover:bg-[#383838] px-4 py-1.5 text-xs font-semibold transition text-white border border-[#444444] shadow-sm disabled:opacity-50"
            title="Run visible sample testcases"
          >
            <span>{isRunning ? "⏳" : "▶"}</span>
            <span>{isRunning ? "Running..." : "Run"}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmitCode}
            disabled={isExecuting || isReadOnlyView}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-semibold transition text-white shadow-md disabled:opacity-50"
            title="Submit to full judge"
          >
            <span>{isSubmitting ? "⏳" : "☁"}</span>
            <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
          </button>
        </div>

        <div className="relative flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsToolsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg bg-[#282828] hover:bg-[#333333] px-3 py-1.5 text-xs font-semibold transition text-gray-200 border border-[#3e3e3e]"
            >
              <span>🛠️ Tools</span>
              <span className="text-[10px]">▼</span>
            </button>

            {isToolsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#3e3e3e] bg-[#282828] p-1.5 shadow-2xl z-[100] text-xs">
                <button
                  type="button"
                  onClick={() => { setActiveToolModal("timer"); setIsToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#383838] transition text-gray-200"
                >
                  <span>⏱️ Room Timer</span>
                  <span className="ml-auto text-[10px] text-gray-400">{formattedRemainingTime}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveToolModal("collaborators"); setIsToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#383838] transition text-gray-200"
                >
                  <span>👥 Room Collaborators</span>
                  <span className="ml-auto text-[10px] text-emerald-400">{clients.length} online</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveToolModal("testcases"); setIsToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#383838] transition text-gray-200"
                >
                  <span>🧪 Testcases & Stdin</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveToolModal("whiteboard"); setIsToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#383838] transition text-gray-200"
                >
                  <span>🎨 Collaborative Whiteboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveToolModal("runtime"); setIsToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#383838] transition text-gray-200"
                >
                  <span>📊 Runtime & System Status</span>
                </button>
                <div className="my-1 border-t border-[#383838]" />
                <button
                  type="button"
                  onClick={() => { handleDownloadCode(); setIsToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#383838] transition text-gray-200"
                >
                  <span>💾 Download Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveToolModal("profile"); setIsToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#383838] transition text-gray-200"
                >
                  <span>👤 Profile & Security</span>
                </button>
              </div>
            )}
          </div>

          {auth?.currentUser ? (
            <button
              type="button"
              onClick={() => setActiveToolModal("profile")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-white font-bold text-xs hover:opacity-90"
              title={auth.currentUser.email}
            >
              {auth.currentUser.email?.charAt(0).toUpperCase() || "U"}
            </button>
          ) : null}
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN SPLIT WORKSPACE */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2 bg-[#181818]">
        {/* Left Column: Problem Description & Submissions Panel */}
        <div className="w-1/2 flex flex-col rounded-xl border border-[#2d2d2d] bg-[#222222] overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2d2d2d] bg-[#222222] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveLeftTab("description")}
              className={`px-3 py-1.5 rounded-lg transition ${activeLeftTab === "description" ? "bg-[#333333] text-emerald-400 font-bold" : "text-gray-400 hover:text-gray-200"}`}
            >
              📄 Description
            </button>
            <button
              type="button"
              onClick={() => setActiveLeftTab("editorial")}
              className={`px-3 py-1.5 rounded-lg transition ${activeLeftTab === "editorial" ? "bg-[#333333] text-emerald-400 font-bold" : "text-gray-400 hover:text-gray-200"}`}
            >
              💡 Editorial
            </button>
            <button
              type="button"
              onClick={() => setActiveLeftTab("submissions")}
              className={`px-3 py-1.5 rounded-lg transition ${activeLeftTab === "submissions" ? "bg-[#333333] text-emerald-400 font-bold" : "text-gray-400 hover:text-gray-200"}`}
            >
              📜 Submissions
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-gray-200">
            {activeLeftTab === "description" && (
              <>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    {roomState.problem.title || "Sample Algorithmic Challenge"}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      (roomState.problem.difficulty || "medium") === "easy"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                        : (roomState.problem.difficulty || "medium") === "hard"
                        ? "bg-red-950 text-red-400 border border-red-700"
                        : "bg-amber-950 text-amber-400 border border-amber-700"
                    }`}>
                      {roomState.problem.difficulty || "medium"}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#333333] text-gray-300 border border-[#444444]">
                      {(roomState.problem.category || "General").replace(/-/g, " ")}
                    </span>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed space-y-3">
                  <p className="whitespace-pre-wrap">{roomState.problem.statement || "No problem statement provided."}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border border-[#383838] bg-[#1a1a1a] p-3 text-xs">
                    <span className="text-gray-400 block font-medium">Target Time Complexity</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm mt-0.5 block">
                      {roomState.problem.targetTimeComplexity || "O(n)"}
                    </span>
                  </div>
                  <div className="rounded-lg border border-[#383838] bg-[#1a1a1a] p-3 text-xs">
                    <span className="text-gray-400 block font-medium">Target Space Complexity</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm mt-0.5 block">
                      {roomState.problem.targetSpaceComplexity || "O(1)"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-white text-sm">Example Test Cases</h3>
                  {visibleTestCaseItems.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No visible sample cases provided.</p>
                  ) : (
                    visibleTestCaseItems.map((tc, idx) => (
                      <div key={`sample-case-${idx}`} className="rounded-lg border border-[#383838] bg-[#1a1a1a] p-3 space-y-2 text-xs font-mono">
                        <span className="text-gray-400 font-sans font-semibold block">Example {idx + 1}:</span>
                        <div>
                          <span className="text-gray-500 block">Input:</span>
                          <pre className="text-emerald-300 bg-[#121212] p-2 rounded mt-1 overflow-x-auto">{tc.input || "None"}</pre>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Output:</span>
                          <pre className="text-emerald-300 bg-[#121212] p-2 rounded mt-1 overflow-x-auto">{tc.output || "None"}</pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeLeftTab === "editorial" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Algorithm & Solution Strategy</h2>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Break down the problem using optimal data structures. Focus on reducing time complexity from naive brute force to optimal target complexity.
                </p>
                <div className="rounded-lg border border-[#383838] bg-[#1a1a1a] p-4 text-xs space-y-2">
                  <h4 className="font-bold text-emerald-400">Key Takeaways</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li>Use hash maps or two pointers for array lookup optimization.</li>
                    <li>Maintain fast execution within the {roomState.problem.timeLimitMs || 2000}ms time limit.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeLeftTab === "submissions" && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">Submission History</h2>
                {submitAttempts.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No submissions made yet for this challenge.</p>
                ) : (
                  submitAttempts.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg border border-[#383838] bg-[#1a1a1a] p-3 text-xs">
                      <div>
                        <span className={`font-bold ${sub.passed ? "text-emerald-400" : "text-red-400"}`}>
                          {sub.passed ? "Accepted" : "Wrong Answer"}
                        </span>
                        <span className="text-gray-400 block text-[11px] mt-0.5">{sub.username} · {sub.language}</span>
                      </div>
                      <span className="text-gray-400 text-[11px]">{new Date(sub.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Mirror & Console Panel */}
        <div className="w-1/2 flex flex-col rounded-xl border border-[#2d2d2d] bg-[#222222] overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#2d2d2d] bg-[#222222]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-300">Code</span>
              <select
                value={lang}
                onChange={(e) => { setLang(e.target.value); window.location.reload(); }}
                className="rounded-md bg-[#1a1a1a] text-emerald-400 text-xs px-2.5 py-1 font-semibold border border-[#383838] outline-none"
              >
                <option value="clike">C++ / Java</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCode}
                className="px-2.5 py-1 rounded-md bg-[#1a1a1a] hover:bg-[#333333] text-gray-300 text-xs transition border border-[#383838]"
                title="Download code"
              >
                💾 Save
              </button>
              <CopyCodeButton codeRef={codeRef} />
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
            <Editor
              ref={editorInstanceRef}
              socketRef={socketRef}
              roomId={roomId}
              isRealtime={isRoomMode}
              readOnly={isReadOnlyView}
              onCodeChange={(code) => {
                codeRef.current = code;
                setEditorSnapshot(code);
              }}
            />
          </div>

          <div className="h-44 border-t border-[#2d2d2d] bg-[#1a1a1a] flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2d2d2d] bg-[#222222]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300">Console Output</span>
                <span className="text-[11px] text-emerald-400 font-mono">{executionMeta.time}</span>
              </div>
              <button
                type="button"
                onClick={handleClearOutput}
                className="text-[11px] text-gray-400 hover:text-gray-200"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 p-3 font-mono text-xs text-gray-300 overflow-y-auto bg-[#121212]">
              <pre className="whitespace-pre-wrap">{runOutput}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CLEAN POPUP MODALS FOR EXTRA TOOLS */}
      {activeToolModal === "problemList" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={() => setActiveToolModal(null)}>
          <div className="relative w-full max-w-2xl rounded-2xl border border-[#3e3e3e] bg-[#222222] p-6 shadow-2xl text-white max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-[#333333]">
              <h3 className="text-lg font-bold">📋 Problem Library (500 Questions)</h3>
              <button type="button" onClick={() => setActiveToolModal(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="py-4 space-y-3">
              <input
                type="text"
                placeholder="Search problems by title, topic, or difficulty..."
                value={problemSearchQuery}
                onChange={(e) => setProblemSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#383838] bg-[#161616] px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {problemLibrary
                .filter(p => !problemSearchQuery || p.title.toLowerCase().includes(problemSearchQuery.toLowerCase()))
                .slice(0, 50)
                .map((prob, idx) => (
                  <div
                    key={prob.id}
                    onClick={() => {
                      handleLoadProblemFromLibrary(prob.id);
                      setActiveToolModal(null);
                    }}
                    className="flex items-center justify-between rounded-xl border border-[#333333] bg-[#1a1a1a] p-3 hover:border-emerald-500 cursor-pointer transition"
                  >
                    <div>
                      <strong className="text-sm text-gray-100">{idx + 1}. {prob.title}</strong>
                      <span className="text-xs text-gray-400 block mt-0.5">{(prob.category || "General").replace(/-/g, " ")}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                      prob.difficulty === "easy" ? "text-emerald-400 bg-emerald-950" : prob.difficulty === "hard" ? "text-red-400 bg-red-950" : "text-amber-400 bg-amber-950"
                    }`}>
                      {prob.difficulty || "medium"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeToolModal === "timer" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={() => setActiveToolModal(null)}>
          <div className="relative w-full max-w-md rounded-2xl border border-[#3e3e3e] bg-[#222222] p-6 shadow-2xl text-white space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[#333333]">
              <h3 className="text-lg font-bold">⏱️ Room Timer</h3>
              <button type="button" onClick={() => setActiveToolModal(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="text-center py-4 space-y-2">
              <span className="text-4xl font-mono font-extrabold text-emerald-400">{formattedRemainingTime}</span>
              <p className="text-xs text-gray-400">Countdown timer for room coding sprint</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleTimerStart} disabled={isTimerRunning} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 font-bold text-xs">Start</button>
              <button type="button" onClick={handleTimerReset} className="flex-1 rounded-xl bg-[#333333] hover:bg-[#444444] py-2.5 font-bold text-xs">Reset</button>
            </div>
          </div>
        </div>
      )}

      {activeToolModal === "collaborators" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={() => setActiveToolModal(null)}>
          <div className="relative w-full max-w-md rounded-2xl border border-[#3e3e3e] bg-[#222222] p-6 shadow-2xl text-white space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[#333333]">
              <h3 className="text-lg font-bold">👥 Room Collaborators ({clients.length})</h3>
              <button type="button" onClick={() => setActiveToolModal(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {clients.map((c) => (
                <div key={c.socketId} className="flex items-center justify-between p-2.5 rounded-lg bg-[#1a1a1a] border border-[#333333] text-xs">
                  <span className="font-semibold text-gray-200">{c.username}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">Online</span>
                </div>
              ))}
            </div>
            {isRoomMode && (
              <button type="button" onClick={copyRoomId} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 font-bold text-xs">
                📋 Copy Room Link / ID
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

};

export default EditorPage;
