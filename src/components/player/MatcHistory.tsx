// src/components/player/MatchHistory.tsx
import React, { useState } from 'react';
import { MatchData } from '../../types/playerTypes';
import MatchModal from './MatchModal';
import '../../styles/components/player/_match-history.scss';

interface MatchHistoryProps {
  matches: MatchData[];
  openModalIndex: number | null;
  setOpenModalIndex: (index: number | null) => void;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ 
  matches, 
  openModalIndex, 
  setOpenModalIndex 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 5;
  
  // Reverse the matches array to show recent matches first
  const reversedMatches = [...matches].reverse();
  
  // Calculate total pages
  const totalPages = Math.ceil(reversedMatches.length / matchesPerPage);
  
  // Calculate the matches to display on current page
  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = reversedMatches.slice(indexOfFirstMatch, indexOfLastMatch);
  
  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setOpenModalIndex(null); // Close any open modal when changing page
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setOpenModalIndex(null); // Close any open modal when changing page
    }
  };
  
  const handlePageClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setOpenModalIndex(null); // Close any open modal when changing page
  };
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots: Array<number | string> = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };
  
  if (matches.length === 0) {
    return <div className="no-data">No match data available</div>;
  }
  
  return (
    <div className="match-history">
      <div className="matches-container">
        {currentMatches.map((match, localIndex) => {
          // Calculate the original index to maintain correct match numbering
          const originalIndex = matches.length - 1 - (indexOfFirstMatch + localIndex);
          return (
            <div key={originalIndex} className="match-item-wrapper">
              <MatchModal 
                match={match} 
                index={originalIndex}
                openModalIndex={openModalIndex}
                setOpenModalIndex={setOpenModalIndex}
              />
            </div>
          );
        })}
      </div>
      
      {totalPages > 1 && (
        <div className="pagination-container">
          <button 
            className="pagination-arrow prev"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <i className="material-icons">chevron_left</i>
          </button>
          
          <div className="pagination-numbers">
            {getPageNumbers().map((number, index) => (
              <React.Fragment key={index}>
                {number === '...' ? (
                  <span className="pagination-dots">{number}</span>
                ) : (
                  <button
                    className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                    onClick={() => handlePageClick(number as number)}
                    aria-label={`Page ${number}`}
                    aria-current={currentPage === number ? 'page' : undefined}
                  >
                    {number}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>
          
          <button 
            className="pagination-arrow next"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <i className="material-icons">chevron_right</i>
          </button>
        </div>
      )}
      
      <div className="match-info">
        {/* Show the actual match numbers being displayed */}
        Showing matches {matches.length - indexOfFirstMatch} - {matches.length - Math.min(indexOfLastMatch, reversedMatches.length) + 1} of {matches.length} matches
      </div>
    </div>
  );
};

export default MatchHistory;