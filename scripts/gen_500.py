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
        ("Two Sum", "easy", "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.", "O(n)", "O(n)", [("4\n2 7 11 15\n9", "0 1")]),
        ("Best Time to Buy and Sell Stock", "easy", "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\n\nFind the maximum profit you can achieve by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.", "O(n)", "O(1)", [("6\n7 1 5 3 6 4", "5")]),
        ("Contains Duplicate", "easy", "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.", "O(n)", "O(n)", [("4\n1 2 3 1", "true")]),
        ("Product of Array Except Self", "medium", "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]` without using division.", "O(n)", "O(1)", [("4\n1 2 3 4", "24 12 8 6")]),
        ("Maximum Subarray Sum", "medium", "Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.", "O(n)", "O(1)", [("5\n-2 1 -3 4 -1", "4")]),
        ("Maximum Product Subarray", "medium", "Given an integer array `nums`, find a contiguous non-empty subarray within the array that has the largest product, and return the product.", "O(n)", "O(1)", [("4\n2 3 -2 4", "6")]),
        ("Find Minimum in Rotated Sorted Array", "medium", "Suppose an array of length `n` sorted in ascending order is rotated between `1` and `n` times. Given the rotated sorted array `nums` of unique elements, return the minimum element of this array.", "O(log n)", "O(1)", [("5\n3 4 5 1 2", "1")]),
        ("Search in Rotated Sorted Array", "medium", "Given the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.", "O(log n)", "O(1)", [("7\n4 5 6 7 0 1 2\n0", "4")]),
        ("3Sum", "medium", "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.", "O(n^2)", "O(1)", [("6\n-1 0 1 2 -1 -4", "[-1,-1,2], [-1,0,1]")]),
        ("Container With Most Water", "medium", "Given `n` non-negative integers `height` where each represents a point at coordinate `(i, height[i])`. Find two lines that together with the x-axis form a container holding the most water.", "O(n)", "O(1)", [("9\n1 8 6 2 5 4 8 3 7", "49")]),
    ],
    "strings": [
        ("Valid Anagram", "easy", "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.", "O(n)", "O(1)", [("anagram\nnagaram", "true")]),
        ("Longest Substring Without Repeating Characters", "medium", "Given a string `s`, find the length of the longest substring without repeating characters.", "O(n)", "O(n)", [("abcabcbb", "3")]),
        ("Longest Palindromic Substring", "medium", "Given a string `s`, return the longest palindromic substring in `s`.", "O(n^2)", "O(1)", [("babad", "bab")]),
        ("Valid Palindrome", "easy", "Given a string `s`, return `true` if it is a palindrome, considering only alphanumeric characters and ignoring cases.", "O(n)", "O(1)", [("A man, a plan, a canal: Panama", "true")]),
        ("Group Anagrams", "medium", "Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.", "O(n * k log k)", "O(n * k)", [("6\neat tea tan ate nat bat", "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]")]),
    ],
    "backtracking": [
        ("Subsets", "medium", "Given an integer array `nums` of unique elements, return all possible subsets (the power set).\n\nThe solution set must not contain duplicate subsets. Return the solution in any order.", "O(2^n)", "O(n)", [("3\n1 2 3", "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]")]),
        ("Permutations", "medium", "Given an array `nums` of distinct integers, return all the possible permutations. You can return the answer in any order.", "O(n!)", "O(n)", [("3\n1 2 3", "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]")]),
        ("Combination Sum", "medium", "Given an array of distinct integers `candidates` and a target integer `target`, return a list of all unique combinations of `candidates` where the chosen numbers sum to `target`.", "O(2^t)", "O(t)", [("4\n2 3 6 7\n7", "[[2,2,3],[7]]")]),
        ("N-Queens", "hard", "The n-queens puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other.\n\nGiven an integer `n`, return all distinct solutions to the n-queens puzzle.", "O(n!)", "O(n^2)", [("4", "[[.Q..,...Q,Q...,..Q.],[..Q.,Q...,...Q,.Q..]]")]),
        ("Word Search", "medium", "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid using sequential adjacent cells.", "O(m*n*4^L)", "O(L)", [("3 4\nA B C E\nS F C S\nA D E E\nABCCED", "true")]),
    ],
    "dynamic-programming": [
        ("Climbing Stairs", "easy", "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?", "O(n)", "O(1)", [("3", "3")]),
        ("Coin Change", "medium", "You are given an integer array `coins` representing coins of different denominations and an integer `amount`. Return the fewest number of coins that you need to make up that amount.", "O(n * amount)", "O(amount)", [("3\n1 2 5\n11", "3")]),
        ("Longest Increasing Subsequence", "medium", "Given an integer array `nums`, return the length of the longest strictly increasing subsequence.", "O(n log n)", "O(n)", [("6\n10 9 2 5 3 7 101 18", "4")]),
        ("0/1 Knapsack", "medium", "Given weights and values of `n` items, put these items in a knapsack of capacity `W` to get the maximum total value in the knapsack.", "O(n * W)", "O(W)", [("3 50\n10 20 30\n60 100 120", "220")]),
    ],
    "graphs": [
        ("Number of Islands", "medium", "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.", "O(m * n)", "O(m * n)", [("4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", "1")]),
        ("Clone Graph", "medium", "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.", "O(V + E)", "O(V)", [("4\n2 4\n1 3\n2 4\n1 3", "Cloned Graph Structure")]),
        ("Course Schedule", "medium", "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. Return `true` if you can finish all courses given prerequisite dependencies.", "O(V + E)", "O(V + E)", [("2\n1 0", "true")]),
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
