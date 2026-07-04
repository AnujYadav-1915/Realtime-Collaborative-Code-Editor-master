import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];

const difficultyColors = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

const ProblemBrowser = ({ backendBaseUrl, canSetShared = false, loadActionLabel, loadActionTitle, onSelect, onLoad, onClose }) => {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [category, setCategory] = useState('all');
  const [allProblems, setAllProblems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const searchInputRef = useRef(null);
  const fetchTimerRef = useRef(null);
  
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(`${backendBaseUrl}/api/problems/meta`);
        if (!res.ok) return;
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (_) {}
    };
    fetchMeta();
    searchInputRef.current?.focus();
  }, [backendBaseUrl]);
  
  const fetchProblems = useCallback(
    async (currentSearch, currentCategory) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: currentSearch,
          category: currentCategory === 'all' ? '' : currentCategory,
          page: 1,
          limit: 2000,
        });
        const res = await fetch(`${backendBaseUrl}/api/problems?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setAllProblems(Array.isArray(data.problems) ? data.problems : []);
      } catch (_) {
        setAllProblems([]);
      } finally {
        setLoading(false);
      }
    },
    [backendBaseUrl]
  );
  
  useEffect(() => {
    clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(() => {
      fetchProblems(search, category);
    }, 220);
    return () => clearTimeout(fetchTimerRef.current);
  }, [search, category, fetchProblems]);
  
  const displayedProblems = useMemo(() => {
    if (difficulty === 'all') return allProblems;
    return allProblems.filter((problem) => (problem.difficulty || 'medium') === difficulty);
  }, [allProblems, difficulty]);
  
  const difficultyCounts = useMemo(() => {
    return allProblems.reduce(
      (acc, problem) => {
        const diff = problem.difficulty || 'medium';
        if (acc[diff] !== undefined) acc[diff] += 1;
        return acc;
      },
      { easy: 0, medium: 0, hard: 0 }
    );
  }, [allProblems]);
  
  const handleSearchChange = (event) => setSearch(event.target.value);
  
  const handleDifficultyChange = (nextDifficulty) => {
    setDifficulty(nextDifficulty);
  };
  
  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
  };
  
  const handleLoad = () => {
    if (!selectedId) return;
    onSelect(selectedId);
    if (onLoad) {
      onLoad(selectedId);
    } else {
      onClose();
    }
  };
  
  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  const resolvedLoadLabel = loadActionLabel || (canSetShared ? 'Set Room Problem' : 'Open Preview');
  const resolvedLoadTitle = loadActionTitle || (canSetShared ? 'Set as shared room problem' : 'Open personal preview');
  
  return (
    <div className="pbOverlay" onClick={handleOverlayClick}>
      <div className="pbModal" role="dialog" aria-label="Problem Browser">
        <div className="pbHeader">
          <div className="pbHeaderLeft">
            <span className="pbHeaderIcon">📚</span>
            <span className="pbHeaderTitle">Problem Library</span>
            <span className="pbTotalBadge">{displayedProblems.length} problems</span>
          </div>
          <button className="pbCloseBtn" onClick={onClose} title="Close">✕</button>
        </div>
  
        <div className="pbStatRow">
          {['easy', 'medium', 'hard'].map((level) => (
            <span
              key={level}
              className={`pbStatPill pbStatPill--${level}`}
              onClick={() => handleDifficultyChange(difficulty === level ? 'all' : level)}
              style={{ cursor: 'pointer' }}
            >
              {difficultyCounts[level]} <span style={{ textTransform: 'capitalize' }}>{level}</span>
            </span>
          ))}
        </div>
  
        <div className="pbToolbar">
          <div className="pbSearchWrap">
            <span className="pbSearchIcon">⌕</span>
            <input
              ref={searchInputRef}
              type="text"
              className="pbSearchInput"
              placeholder="Search title, topic, tag..."
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button className="pbClearSearch" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
  
          <div className="pbDiffBtns">
            {DIFFICULTIES.map((level) => (
              <button
                key={level}
                className={`pbDiffBtn pbDiffBtn--${level}${difficulty === level ? ' active' : ''}`}
                onClick={() => handleDifficultyChange(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
  
          <select className="pbCategorySelect" value={category} onChange={handleCategoryChange}>
            <option value="all">All Categories</option>
            {categories.map((nextCategory) => (
              <option key={nextCategory} value={nextCategory}>
                {nextCategory.charAt(0).toUpperCase() + nextCategory.slice(1).replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </div>
  
        <div className="pbList">
          {loading ? (
            <div className="pbEmpty">
              <span className="pbEmptyIcon">⏳</span>
              <span>Loading problems...</span>
            </div>
          ) : displayedProblems.length === 0 ? (
            <div className="pbEmpty">
              <span className="pbEmptyIcon">🔍</span>
              <span>No problems match your filters.</span>
            </div>
          ) : (
            displayedProblems.map((problem, index) => (
              <div
                key={problem.id}
                className={`pbProblemRow${selectedId === problem.id ? ' selected' : ''}`}
                onClick={() => setSelectedId(problem.id)}
                onDoubleClick={() => {
                  setSelectedId(problem.id);
                  onSelect(problem.id);
                  onLoad?.(problem.id);
                }}
                title={resolvedLoadTitle}
              >
                <span className="pbProblemNum">{index + 1}</span>
                <div className="pbProblemInfo">
                  <span className="pbProblemTitle">{problem.title}</span>
                  <div className="pbProblemMeta">
                    {problem.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="pbTag">{tag}</span>
                    ))}
                    {problem.targetTimeComplexity ? (
                      <span className="pbComplexityChip">{problem.targetTimeComplexity}</span>
                    ) : null}
                  </div>
                </div>
                <div className="pbProblemRight">
                  <span
                    className={`pbDiffBadge pbDiffBadge--${problem.difficulty || 'medium'}`}
                    style={{ color: difficultyColors[problem.difficulty] || difficultyColors.medium }}
                  >
                    {(problem.difficulty || 'medium').charAt(0).toUpperCase() + (problem.difficulty || 'medium').slice(1)}
                  </span>
                  <span className="pbCategoryBadge">{(problem.category || 'other').replace(/-/g, ' ')}</span>
                </div>
              </div>
            ))
          )}
        </div>
  
        <div className="pbFooter">
          <span className="pbFooterHint">
            {selectedId
              ? `Selected: ${displayedProblems.find((p) => p.id === selectedId)?.title || selectedId}`
              : 'Click a problem to select, double-click to load immediately'}
          </span>
          <div className="pbFooterBtns">
            <button className="btn secondarySidebarBtn" onClick={onClose}>Cancel</button>
            <button
              className="btn primarySidebarBtn"
              onClick={handleLoad}
              disabled={!selectedId}
              title={resolvedLoadTitle}
            >
              {resolvedLoadLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
  
export default ProblemBrowser;
