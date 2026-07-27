import re

fp = "/Users/anujyadav/Documents/Projects/sync-code-realtime-editor-main/src/pages/EditorPage.js"

with open(fp, "r") as f:
    code = f.read()

# Add new LeetCode UI states near other useState definitions if not already present
if "activeLeftTab" not in code:
    state_injection = """  const [activeLeftTab, setActiveLeftTab] = useState("description");
  const [activeToolModal, setActiveToolModal] = useState(null);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [problemSearchQuery, setProblemSearchQuery] = useState("");
  const [problemCategoryFilter, setProblemCategoryFilter] = useState("all");
"""
    code = code.replace("const [outputPanelTab, setOutputPanelTab] = useState(\"output\");", "const [outputPanelTab, setOutputPanelTab] = useState(\"output\");\n" + state_injection)

# Add helper functions for problem navigation if not already present
if "handleNextProblemInLibrary" not in code:
    helpers_injection = """
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
"""
    code = code.replace("const handleLoadProblemFromLibrary = useCallback(async (problemId) => {", helpers_injection + "\n  const handleLoadProblemFromLibrary = useCallback(async (problemId) => {")

with open(fp, "w") as f:
    f.write(code)

print("Injected state and helper functions into EditorPage.js")
