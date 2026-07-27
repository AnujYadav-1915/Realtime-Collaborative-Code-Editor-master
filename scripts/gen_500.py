import json
import os

categories = [
    "arrays", "strings", "dynamic-programming", "graphs", "binary-trees",
    "backtracking", "linked-list", "stack", "queue", "sliding-window",
    "sorting", "searching", "greedy", "hashing", "heap",
    "trie", "union-find", "bit-manipulation", "matrix", "math"
]

problem_templates = {
    "arrays": [
        ("Two Sum", "easy", "Find two numbers in array that add up to target.", "O(n)", "O(n)", [("4\n2 7 11 15\n9", "0 1")]),
        ("Best Time to Buy and Sell Stock", "easy", "Find maximum profit from buying and selling stock once.", "O(n)", "O(1)", [("6\n7 1 5 3 6 4", "5")]),
        ("Contains Duplicate", "easy", "Check if any value appears at least twice in array.", "O(n)", "O(n)", [("4\n1 2 3 1", "true")]),
        ("Product of Array Except Self", "medium", "Return array where each element is product of all others.", "O(n)", "O(1)", [("4\n1 2 3 4", "24 12 8 6")]),
        ("Maximum Subarray Sum", "medium", "Find contiguous subarray with largest sum.", "O(n)", "O(1)", [("5\n-2 1 -3 4 -1", "4")]),
        ("Maximum Product Subarray", "medium", "Find contiguous subarray with largest product.", "O(n)", "O(1)", [("4\n2 3 -2 4", "6")]),
        ("Find Minimum in Rotated Sorted Array", "medium", "Find minimum element in rotated sorted array.", "O(log n)", "O(1)", [("5\n3 4 5 1 2", "1")]),
        ("Search in Rotated Sorted Array", "medium", "Search target in rotated sorted array.", "O(log n)", "O(1)", [("7\n4 5 6 7 0 1 2\n0", "4")]),
        ("3Sum", "medium", "Find all unique triplets in array that sum to zero.", "O(n^2)", "O(1)", [("6\n-1 0 1 2 -1 -4", "[-1,-1,2], [-1,0,1]")]),
        ("Container With Most Water", "medium", "Find two lines that together with x-axis form container holding most water.", "O(n)", "O(1)", [("9\n1 8 6 2 5 4 8 3 7", "49")]),
        ("Trapping Rain Water", "hard", "Compute how much water array height map can trap after raining.", "O(n)", "O(1)", [("12\n0 1 0 2 1 0 1 3 2 1 2 1", "6")]),
        ("Merge Sorted Array", "easy", "Merge nums2 into nums1 as one sorted array.", "O(m+n)", "O(1)", [("3 3\n1 2 3\n2 5 6", "1 2 2 3 5 6")]),
        ("Pascal Triangle", "easy", "Generate first numRows of Pascal triangle.", "O(n^2)", "O(n^2)", [("5", "1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1")]),
        ("Rotate Array", "medium", "Rotate array to right by k steps.", "O(n)", "O(1)", [("7 3\n1 2 3 4 5 6 7", "5 6 7 1 2 3 4")]),
        ("Sort Colors", "medium", "Sort array of red, white, blue (0, 1, 2) in-place.", "O(n)", "O(1)", [("6\n2 0 2 1 1 0", "0 0 1 1 2 2")]),
        ("Subarray Sum Equals K", "medium", "Find total number of continuous subarrays whose sum equals k.", "O(n)", "O(n)", [("3 2\n1 1 1", "2")]),
        ("Next Permutation", "medium", "Rearrange numbers into lexicographically next greater permutation.", "O(n)", "O(1)", [("3\n1 2 3", "1 3 2")]),
        ("Majority Element", "easy", "Find element that appears more than n/2 times.", "O(n)", "O(1)", [("7\n2 2 1 1 1 2 2", "2")]),
        ("Move Zeroes", "easy", "Move all zeroes to end while maintaining relative order of non-zeroes.", "O(n)", "O(1)", [("5\n0 1 0 3 12", "1 3 12 0 0")]),
        ("Find All Duplicates in an Array", "medium", "Find all elements that appear twice in integer array.", "O(n)", "O(1)", [("8\n4 3 2 7 8 2 3 1", "2 3")]),
        ("First Missing Positive", "hard", "Find smallest missing positive integer.", "O(n)", "O(1)", [("4\n3 4 -1 1", "2")]),
        ("Largest Number", "medium", "Arrange non-negative integers to form largest number.", "O(n log n)", "O(n)", [("5\n3 30 34 5 9", "9534330")]),
        ("Set Matrix Zeroes", "medium", "If an element is 0, set its entire row and column to 0.", "O(m*n)", "O(1)", [("3 3\n1 1 1\n1 0 1\n1 1 1", "1 0 1\n0 0 0\n1 0 1")]),
        ("Spiral Matrix", "medium", "Return all elements of m x n matrix in spiral order.", "O(m*n)", "O(1)", [("3 3\n1 2 3\n4 5 6\n7 8 9", "1 2 3 6 9 8 7 4 5")]),
        ("Word Search", "medium", "Check if word exists in grid of letters.", "O(m*n*4^L)", "O(L)", [("3 4\nA B C E\nS F C S\nA D E E\nABCCED", "true")])
    ]
}

problems = []

for cat in categories:
    templates = problem_templates.get(cat, [])
    cat_title = cat.replace("-", " ").title()
    for idx in range(1, 26):
        if idx <= len(templates):
            title, diff, statement, tc, sc, vis = templates[idx-1]
        else:
            title = f"{cat_title} Problem {idx}"
            diff = ["easy", "medium", "hard"][(idx % 3)]
            statement = f"Solve the standard {cat_title} algorithmic challenge #{idx}. Optimize logic for O(n) time complexity."
            tc = "O(n)" if (idx % 2 == 0) else "O(n log n)"
            sc = "O(1)" if (idx % 2 == 0) else "O(n)"
            vis = [("Sample Input", "Sample Output")]

        clean_title_id = title.lower().replace(" ", "-").replace("(", "").replace(")", "")
        prob_id = f"{cat}-{idx}-{clean_title_id}"
        problems.append({
            "id": prob_id,
            "title": title,
            "difficulty": diff,
            "category": cat,
            "tags": [cat, diff, f"level-{idx}"],
            "statement": statement,
            "targetTimeComplexity": tc,
            "targetSpaceComplexity": sc,
            "timeLimitMs": 2000,
            "memoryLimitKb": 131072,
            "timerDurationSeconds": 1800,
            "visibleTestCases": [{"input": vis[0][0], "output": vis[0][1]}],
            "hiddenTestCases": [{"input": "Hidden Test 1", "output": "Hidden Output 1"}, {"input": "Hidden Test 2", "output": "Hidden Output 2"}]
        })

os.makedirs("data", exist_ok=True)

with open("data/problem-library.json", "w") as f:
    json.dump(problems, f, indent=2)

print(f"Successfully generated {len(problems)} problems across {len(categories)} categories!")
