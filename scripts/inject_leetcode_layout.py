import re

fp = "/Users/anujyadav/Documents/Projects/sync-code-realtime-editor-main/src/pages/EditorPage.js"

with open(fp, "r") as f:
    code = f.read()

# Locate return statement of EditorPage
return_start = code.find("  return (\n    <div className={`editorPageLayout")
if return_start == -1:
    return_start = code.find("  return (\n    <div className=")

print("Found return statement at offset:", return_start)

# Replace the entire return statement with LeetCode clean return statement
new_return = """  return (
    <div className="leetcodeWorkspace flex flex-col h-screen w-screen overflow-hidden bg-[#181818] text-white">
      {/* 1. LEETCODE TOP NAVIGATION BAR */}
      <header className="leetcodeTopBar flex items-center justify-between px-4 py-2 border-b border-[#2d2d2d] bg-[#1c1c1c] z-50 select-none">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 font-bold text-emerald-400 hover:opacity-90">
            <span className="text-xl">⚡</span>
            <span className="hidden sm:inline text-sm font-extrabold text-white">Sync Code</span>
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

          {auth.currentUser ? (
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
"""

code = code[:return_start] + new_return + "\n};\n\nexport default EditorPage;\n"

with open(fp, "w") as f:
    f.write(code)

print("Successfully injected clean LeetCode UI workspace!")
