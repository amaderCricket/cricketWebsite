// src/pages/Rules.tsx - Final fixed version with unique IDs
import React, { useState, useEffect, memo } from 'react';
import AnimatedPage from '../components/common/layout/AnimatedPage';
import cricketRules from '../data/rules.json';

// Define types for our rules data
interface RulePoint {
  id: string;
  title: string;
  short: string;
  details: string;
}

interface RuleSection {
  id: string;
  title: string;
  icon: string;
  points: RulePoint[];
}

interface RulesData {
  sections: RuleSection[];
}

// Memo-ized rule point component to prevent unnecessary re-renders
const RulePoint = memo(({ 
  point, 
  isExpanded, 
  onToggle
}: { 
  point: RulePoint; 
  sectionId: string;
  isExpanded: boolean; 
  onToggle: () => void;
}) => {
  return (
    <li className={`rule-point ${isExpanded ? 'expanded' : ''}`}>
      <div 
        className="point-header" 
        onClick={onToggle}
      >
        <div className="point-title">
          <span className="point-icon">
            <i className="material-icons">
              {isExpanded ? 'remove_circle' : 'add_circle'}
            </i>
          </span>
          <h3>{point.title}</h3>
        </div>
        <p className="point-short">{point.short}</p>
      </div>
      <div className={`point-details ${isExpanded ? 'visible' : ''}`}>
        <p>{point.details}</p>
      </div>
    </li>
  );
});

// Memo-ized rule section component
const RuleSection = memo(({ 
  section,
  expandedPoints,
  togglePoint
}: { 
  section: RuleSection; 
  expandedPoints: string[];
  togglePoint: (pointId: string) => void;
}) => {
  return (
    <div className="rule-section">
      <div className="rule-header">
        <i className="material-icons">{section.icon}</i>
        <h2>{section.title}</h2>
      </div>
      <ul className="rule-points">
        {section.points.map(point => {
          // Create a truly unique ID for each point, combining section and point IDs
          const uniqueId = `${section.id}-${point.id}`;
          const isExpanded = expandedPoints.includes(uniqueId);
          
          return (
            <RulePoint 
              key={uniqueId}
              point={point}
              sectionId={section.id}
              isExpanded={isExpanded}
              onToggle={() => togglePoint(uniqueId)}
            />
          );
        })}
      </ul>
    </div>
  );
});

function Rules() {
  // Use array instead of object to track expanded points
  const [expandedPoints, setExpandedPoints] = useState<string[]>([]);
  const [rulesData, setRulesData] = useState<RulesData>({ sections: [] });

  // Load rules data
  useEffect(() => {
    setRulesData(cricketRules as RulesData);
  }, []);

  // Toggle a point's expanded state
  const togglePoint = React.useCallback((pointId: string) => {
    setExpandedPoints(prev => {
      if (prev.includes(pointId)) {
        // Remove the point if it's already expanded
        return prev.filter(id => id !== pointId);
      } else {
        // Add the point if it's not expanded
        return [...prev, pointId];
      }
    });
  }, []);

  return (
    <AnimatedPage>
      <div className="rules-page">
        <div className="container">
          <h1 className="section-title"> RULES</h1>
          <p className="section-description">
            "Essential guidelines for playing in our cricket club"
          </p>

          <div className="rules-container">
            {rulesData.sections.map(section => (
              <RuleSection
                key={section.id}
                section={section}
                expandedPoints={expandedPoints}
                togglePoint={togglePoint}
              />
            ))}
          </div>

          <div className="notes-section">
            <p>
              <strong>Note:</strong> Click on any rule point to see more details. 
              These rules are subject to change and will be updated before each tournament.
            </p>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}

export default Rules;