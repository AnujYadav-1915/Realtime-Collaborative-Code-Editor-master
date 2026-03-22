import json
from pathlib import Path

OUT_PATH = Path(__file__).resolve().parents[1] / "data" / "problem-library.json"

CATEGORIES = [
    ("arrays", ["arrays", "two-pointers", "prefix-sum"]),
    ("graphs", ["graphs", "bfs", "dfs"]),
    ("dynamic-programming", ["dp", "memoization", "tabulation"]),
    ("binary-trees", ["tree", "traversal", "lca"]),
    ("backtracking", ["backtracking", "recursion", "search"]),
    ("strings", ["string", "hashing", "pattern-matching"]),
    ("math", ["math", "number-theory", "mod"]),
    ("sorting", ["sorting", "comparator", "greedy"]),
    ("searching", ["searching", "binary-search", "answer-search"]),
    ("stack", ["stack", "monotonic-stack", "simulation"]),
    ("greedy", ["greedy", "intervals", "scheduling"]),
    ("hashing", ["hashing", "frequency", "map"]),
    ("linked-list", ["linked-list", "pointer", "simulation"]),
    ("heap", ["heap", "priority-queue", "greedy"]),
    ("trie", ["trie", "strings", "prefix"]),
    ("bit-manipulation", ["bitmask", "binary", "math"]),
    ("sliding-window", ["two-pointers", "window", "array"]),
    ("union-find", ["disjoint-set", "graph", "connectivity"]),
    ("queue", ["queue", "simulation", "bfs"]),
    ("matrix", ["matrix", "grid", "simulation"]),
]

STEMS = [
    "Minimum Operations",
    "Maximum Score",
    "Balanced Segments",
    "K-Window Analyzer",
    "Pair Contribution",
    "Query Processor",
    "Range Merge Challenge",
    "Prefix Tracker",
    "Constraint Satisfaction",
    "Path Feasibility",
    "Cost Optimizer",
]


def difficulty_for(index: int) -> str:
    if index % 9 == 0 or index % 11 == 0:
        return "hard"
    if index % 3 == 0 or index % 4 == 0:
        return "medium"
    return "easy"


def limits_for(diff: str):
    if diff == "hard":
        return 3500, 262144, 3600
    if diff == "medium":
        return 2600, 196608, 2400
    return 2000, 131072, 1800


def generate_problem_library():
    problems = []

    for category, tags in CATEGORIES:
        for i in range(1, 51):
            diff = difficulty_for(i)
            time_limit_ms, memory_limit_kb, timer_duration_seconds = limits_for(diff)

            stem = STEMS[(i - 1) % len(STEMS)]
            title = f"{stem} ({category.upper()} #{i})"

            n1 = 4 + (i % 6)
            n2 = 9 + (i % 7)
            arr1 = " ".join(str(((k + i) % 9) + 1) for k in range(n1))
            arr2 = " ".join(str(((k * 2 + i) % 13) + 1) for k in range(n2))

            problems.append(
                {
                    "id": f"{category}-{i:03d}",
                    "title": title,
                    "difficulty": diff,
                    "category": category,
                    "tags": tags + [diff, f"set-{(i - 1) // 5 + 1}"],
                    "statement": (
                        f"Given an input sequence, solve the {title} task for category {category}. "
                        "Design an efficient algorithm, print one valid output value, and respect constraints.\n\n"
                        "Input format:\n"
                        "Line 1: integer n\n"
                        "Line 2: n space-separated integers\n\n"
                        "Output format:\n"
                        "Print one integer according to your computed result.\n\n"
                        "Note: This is an original practice problem set for collaborative interview prep."
                    ),
                    "targetTimeComplexity": "O(n log n)" if diff == "hard" else "O(n)",
                    "targetSpaceComplexity": "O(n)" if diff == "hard" else "O(1)",
                    "timeLimitMs": time_limit_ms,
                    "memoryLimitKb": memory_limit_kb,
                    "timerDurationSeconds": timer_duration_seconds,
                    "visibleTestCases": [
                        {
                            "input": f"{n1}\n{arr1}",
                            "output": str((i % 7) + 3),
                        },
                        {
                            "input": f"{n2}\n{arr2}",
                            "output": str((i % 11) + 5),
                        },
                    ],
                    "hiddenTestCases": [
                        {
                            "input": "5\n1 1 1 1 1",
                            "output": str((i % 5) + 1),
                        },
                        {
                            "input": "6\n2 4 6 8 10 12",
                            "output": str((i % 9) + 2),
                        },
                        {
                            "input": f"1\n{(i % 20) + 1}",
                            "output": str((i % 4) + 1),
                        },
                    ],
                }
            )

    return problems


def main():
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    problems = generate_problem_library()
    OUT_PATH.write_text(json.dumps(problems, indent=2), encoding="utf-8")

    categories_count = len({problem["category"] for problem in problems})
    print(f"Wrote {len(problems)} problems to {OUT_PATH}")
    print(f"Categories: {categories_count}")


if __name__ == "__main__":
    main()
