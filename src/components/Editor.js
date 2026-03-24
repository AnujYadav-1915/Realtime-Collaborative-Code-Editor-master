import React, { useEffect, useRef, useImperativeHandle, useCallback } from "react";
import { language, cmtheme } from "../../src/atoms";
import { useRecoilValue } from "recoil";
import ACTIONS from "../actions/Actions";

// CODE MIRROR
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";

// theme
import "codemirror/theme/3024-day.css";
import "codemirror/theme/3024-night.css";
import "codemirror/theme/abbott.css";
import "codemirror/theme/abcdef.css";
import "codemirror/theme/ambiance.css";
import "codemirror/theme/ayu-dark.css";
import "codemirror/theme/ayu-mirage.css";
import "codemirror/theme/base16-dark.css";
import "codemirror/theme/base16-light.css";
import "codemirror/theme/bespin.css";
import "codemirror/theme/blackboard.css";
import "codemirror/theme/cobalt.css";
import "codemirror/theme/colorforth.css";
import "codemirror/theme/darcula.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/duotone-dark.css";
import "codemirror/theme/duotone-light.css";
import "codemirror/theme/eclipse.css";
import "codemirror/theme/elegant.css";
import "codemirror/theme/erlang-dark.css";
import "codemirror/theme/gruvbox-dark.css";
import "codemirror/theme/hopscotch.css";
import "codemirror/theme/icecoder.css";
import "codemirror/theme/idea.css";
import "codemirror/theme/isotope.css";
import "codemirror/theme/juejin.css";
import "codemirror/theme/lesser-dark.css";
import "codemirror/theme/liquibyte.css";
import "codemirror/theme/lucario.css";
import "codemirror/theme/material.css";
import "codemirror/theme/material-darker.css";
import "codemirror/theme/material-palenight.css";
import "codemirror/theme/material-ocean.css";
import "codemirror/theme/mbo.css";
import "codemirror/theme/mdn-like.css";
import "codemirror/theme/midnight.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/moxer.css";
import "codemirror/theme/neat.css";
import "codemirror/theme/neo.css";
import "codemirror/theme/night.css";
import "codemirror/theme/nord.css";
import "codemirror/theme/oceanic-next.css";
import "codemirror/theme/panda-syntax.css";
import "codemirror/theme/paraiso-dark.css";
import "codemirror/theme/paraiso-light.css";
import "codemirror/theme/pastel-on-dark.css";
import "codemirror/theme/railscasts.css";
import "codemirror/theme/rubyblue.css";
import "codemirror/theme/seti.css";
import "codemirror/theme/shadowfox.css";
import "codemirror/theme/solarized.css";
import "codemirror/theme/the-matrix.css";
import "codemirror/theme/tomorrow-night-bright.css";
import "codemirror/theme/tomorrow-night-eighties.css";
import "codemirror/theme/ttcn.css";
import "codemirror/theme/twilight.css";
import "codemirror/theme/vibrant-ink.css";
import "codemirror/theme/xq-dark.css";
import "codemirror/theme/xq-light.css";
import "codemirror/theme/yeti.css";
import "codemirror/theme/yonce.css";
import "codemirror/theme/zenburn.css";

// modes
import "codemirror/mode/clike/clike";
import "codemirror/mode/css/css";
import "codemirror/mode/dart/dart";
import "codemirror/mode/django/django";
import "codemirror/mode/dockerfile/dockerfile";
import "codemirror/mode/go/go";
import "codemirror/mode/htmlmixed/htmlmixed";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/jsx/jsx";
import "codemirror/mode/markdown/markdown";
import "codemirror/mode/php/php";
import "codemirror/mode/python/python";
import "codemirror/mode/r/r";
import "codemirror/mode/rust/rust";
import "codemirror/mode/ruby/ruby";
import "codemirror/mode/sass/sass";
import "codemirror/mode/shell/shell";
import "codemirror/mode/sql/sql";
import "codemirror/mode/swift/swift";
import "codemirror/mode/xml/xml";
import "codemirror/mode/yaml/yaml";

// features
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/scroll/simplescrollbars.css";

//search
import "codemirror/addon/search/search.js";
import "codemirror/addon/search/searchcursor.js";
import "codemirror/addon/search/jump-to-line.js";
import "codemirror/addon/dialog/dialog.js";
import "codemirror/addon/dialog/dialog.css";

const Editor = React.forwardRef(({ socketRef, roomId, onCodeChange, isRealtime = true, readOnly = false }, ref) => {
  const editorRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const remoteCursorMarkersRef = useRef({});
  const remoteSelectionMarksRef = useRef({});
  const lang = useRecoilValue(language);
  const editorTheme = useRecoilValue(cmtheme);

  useImperativeHandle(ref, () => ({
    setCode: (code) => {
      editorRef.current.setValue(code);
    },
    focus: () => {
      editorRef.current?.focus();
    },
  }));

  const clearRemoteCursor = useCallback((userId) => {
    if (remoteCursorMarkersRef.current[userId]) {
      remoteCursorMarkersRef.current[userId].clear();
      delete remoteCursorMarkersRef.current[userId];
    }

    if (remoteSelectionMarksRef.current[userId]) {
      remoteSelectionMarksRef.current[userId].clear();
      delete remoteSelectionMarksRef.current[userId];
    }
  }, []);

  const renderRemoteCursor = useCallback(({ userId, username, color, cursorPosition, selectionRange }) => {
    if (!editorRef.current || !userId || !cursorPosition) {
      return;
    }

    const lineCount = editorRef.current.lineCount();
    const safeLine = Math.max(0, Math.min(cursorPosition.line || 0, lineCount - 1));
    const currentLineText = editorRef.current.getLine(safeLine) || "";
    const safeCh = Math.max(0, Math.min(cursorPosition.ch || 0, currentLineText.length));

    clearRemoteCursor(userId);

    const cursorNode = document.createElement("span");
    cursorNode.className = "remote-cursor";
    cursorNode.style.borderLeftColor = color || "#F472B6";

    const labelNode = document.createElement("span");
    labelNode.className = "remote-cursor-label";
    labelNode.style.background = color || "#F472B6";
    labelNode.textContent = username || "User";

    const cursorWidget = document.createElement("span");
    cursorWidget.className = "remote-cursor-widget";
    cursorWidget.appendChild(labelNode);
    cursorWidget.appendChild(cursorNode);

    remoteCursorMarkersRef.current[userId] = editorRef.current.setBookmark(
      { line: safeLine, ch: safeCh },
      { widget: cursorWidget }
    );

    const hasSelection = Boolean(
      selectionRange &&
      selectionRange.anchor &&
      selectionRange.head &&
      (selectionRange.anchor.line !== selectionRange.head.line || selectionRange.anchor.ch !== selectionRange.head.ch)
    );

    if (hasSelection) {
      const orderedPositions = [selectionRange.anchor, selectionRange.head].sort((left, right) => {
        if ((left?.line || 0) !== (right?.line || 0)) {
          return (left?.line || 0) - (right?.line || 0);
        }
        return (left?.ch || 0) - (right?.ch || 0);
      });

      remoteSelectionMarksRef.current[userId] = editorRef.current.markText(
        { line: orderedPositions[0].line || 0, ch: orderedPositions[0].ch || 0 },
        { line: orderedPositions[1].line || 0, ch: orderedPositions[1].ch || 0 },
        { className: "remote-selection" }
      );
      return;
    }

    const highlightEndCh = Math.min(safeCh + 1, currentLineText.length || safeCh + 1);
    remoteSelectionMarksRef.current[userId] = editorRef.current.markText(
      { line: safeLine, ch: safeCh },
      { line: safeLine, ch: highlightEndCh },
      { className: "remote-selection" }
    );
  }, [clearRemoteCursor]);


  useEffect(() => {
    async function init() {
      if (editorRef.current) {
        editorRef.current.setOption("mode", { name: lang });
        return;
      }

      editorRef.current = Codemirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: lang },
          theme: "material-darker",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
          readOnly,
        }
      );

      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        console.log("main:editor: ", code);
        onCodeChange(code);

        if (origin !== "setValue") {
          if (isRealtime && socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code,
            });

            if (!isTypingRef.current) {
              isTypingRef.current = true;
              socketRef.current.emit(ACTIONS.TYPING_START, { roomId });
            }

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
              isTypingRef.current = false;
              socketRef.current?.emit(ACTIONS.TYPING_STOP, { roomId });
            }, 2000);
          }
        }
      });

      editorRef.current.on("cursorActivity", (instance) => {
        if (!isRealtime) {
          return;
        }
        const cursorPosition = instance.getCursor();
        const primarySelection = instance.listSelections?.()[0];
        socketRef.current?.emit(ACTIONS.CURSOR_MOVE, {
          roomId,
          cursorPosition,
          selectionRange: primarySelection
            ? {
                anchor: primarySelection.anchor,
                head: primarySelection.head,
              }
            : null,
        });
      });
    }
    init();
  }, [isRealtime, lang, onCodeChange, readOnly, roomId, socketRef]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setOption("theme", editorTheme);
    }
  }, [editorTheme]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setOption("readOnly", readOnly);
    }
  }, [readOnly]);

  useEffect(() => {
    if (!isRealtime) {
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }

    const socket = socketRef.current;

    if (socket) {
      socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          editorRef.current.setValue(code);
        }
      });

      socket.on(ACTIONS.CURSOR_MOVE, (payload) => {
        if (!payload?.userId || payload.userId === socket?.id) {
          return;
        }

        renderRemoteCursor(payload);
      });

      socket.on(ACTIONS.DISCONNECTED, ({ socketId }) => {
        if (socketId) {
          clearRemoteCursor(socketId);
        }
      });

      socket.on(ACTIONS.PRESENCE_UPDATE, ({ clients }) => {
        const activeSocketIds = new Set((clients || []).map((client) => client.socketId));
        Object.keys(remoteCursorMarkersRef.current).forEach((socketId) => {
          if (!activeSocketIds.has(socketId)) {
            clearRemoteCursor(socketId);
          }
        });
      });
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      socket?.emit(ACTIONS.TYPING_STOP, { roomId });
      socket?.off(ACTIONS.CODE_CHANGE);
      socket?.off(ACTIONS.CURSOR_MOVE);
      socket?.off(ACTIONS.DISCONNECTED);
      socket?.off(ACTIONS.PRESENCE_UPDATE);
    };
  }, [isRealtime, roomId, socketRef, clearRemoteCursor, renderRemoteCursor]);

  return <textarea id="realtimeEditor"></textarea>;
});

export default Editor;
