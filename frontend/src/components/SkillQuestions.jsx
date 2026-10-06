import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, Lightbulb, MessageSquareCode, Check } from 'lucide-react';

// Curated high-yield interview questions for common skills
const SKILL_QUESTION_BANK = {
  python: [
    {
      q: "How does Python manage memory, and what is the role of the GIL (Global Interpreter Lock)?",
      tip: "Mention reference counting, generational garbage collector, and how multiprocessing/asyncio bypasses the GIL for CPU/IO tasks."
    },
    {
      q: "Explain the difference between deepcopy and shallow copy, and how decorators work internally in Python.",
      tip: "Define how decorators are closures taking a function as an argument and returning a wrapper function."
    }
  ],
  fastapi: [
    {
      q: "How does FastAPI achieve high performance, and how does its Dependency Injection system work?",
      tip: "Highlight Starlette, Pydantic validation, async/await event loops, and reusable `Depends()` providers."
    },
    {
      q: "How do you handle background tasks and long-running operations in FastAPI production services?",
      tip: "Discuss FastAPI's `BackgroundTasks` for light jobs and Celery/Redis/RabbitMQ queues for heavy background tasks."
    }
  ],
  react: [
    {
      q: "How does React's Reconciliation and Fiber architecture work, and how do you prevent unnecessary re-renders?",
      tip: "Mention virtual DOM diffing, `useMemo`, `useCallback`, `React.memo`, and proper key prop usage."
    },
    {
      q: "When would you use React Context vs Redux/Zustand vs Server State (React Query/TanStack)?",
      tip: "Explain low-frequency global theme/auth vs high-frequency state updates and server cache invalidation."
    }
  ],
  javascript: [
    {
      q: "Explain the JavaScript Event Loop, Microtask Queue vs Macrotask Queue, and closures.",
      tip: "Walk through Call Stack -> Microtasks (Promises, queueMicrotask) -> Macrotasks (setTimeout, DOM events) -> Render."
    },
    {
      q: "What is the difference between `==` vs `===`, prototypal inheritance vs class syntax, and event bubbling vs capturing?",
      tip: "Explain type coercion, the prototype chain (`__proto__`), and `event.stopPropagation()`."
    }
  ],
  typescript: [
    {
      q: "What is the difference between `interface` and `type`, and how do Generics work in TypeScript?",
      tip: "Discuss declaration merging for interfaces, union/tuple support in types, and type safety constraints."
    }
  ],
  docker: [
    {
      q: "How do you optimize Docker images for production, and what are multi-stage builds?",
      tip: "Talk about minimizing layer cache invalidation, Alpine/distroless base images, non-root users, and `.dockerignore`."
    },
    {
      q: "What is the difference between `CMD` and `ENTRYPOINT` in a Dockerfile, and how do container networks work?",
      tip: "Explain default executable vs default arguments, and bridge vs host vs overlay network drivers."
    }
  ],
  kubernetes: [
    {
      q: "Explain Pod lifecycle, Deployments vs StatefulSets, and how Kubernetes handles service discovery.",
      tip: "Discuss kube-proxy, CoreDNS, cluster IP routing, and replica set rolling updates."
    }
  ],
  sql: [
    {
      q: "How do database indexes (B-Tree vs Hash) work, and how do you optimize a slow query?",
      tip: "Walk through reading `EXPLAIN ANALYZE`, avoiding full table scans, understanding composite indexes, and index selectivity."
    },
    {
      q: "What is ACID compliance, and what are the transaction isolation levels and concurrency anomalies (dirty read, phantom read)?",
      tip: "Define Atomicity, Consistency, Isolation, Durability, and Read Committed vs Repeatable Read vs Serializable."
    }
  ],
  postgresql: [
    {
      q: "How does PostgreSQL handle MVCC (Multi-Version Concurrency Control) and VACUUMing?",
      tip: "Explain dead tuples, autovacuum maintenance, write amplification, and connection pooling with PgBouncer."
    }
  ],
  mongodb: [
    {
      q: "When would you choose MongoDB over a relational database, and how does document schema design handle 1-to-N relationships?",
      tip: "Compare embedding vs referencing, discuss horizontal sharding, replica sets, and aggregation pipelines."
    }
  ],
  aws: [
    {
      q: "How do you architect a high-availability, fault-tolerant system on AWS?",
      tip: "Cover Multi-AZ deployments, ALB + Auto Scaling Groups, S3/CloudFront caching, and RDS read replicas."
    }
  ],
  git: [
    {
      q: "What is the difference between `git merge` and `git rebase`, and how does interactive rebase help maintain clean commit history?",
      tip: "Discuss preserving exact timeline vs creating linear history, and how squashing commits improves reviewability."
    }
  ],
  java: [
    {
      q: "How does Java JVM Garbage Collection work, and what is the difference between Heap and Stack memory?",
      tip: "Discuss Young/Old/Metaspace generations, G1/ZGC collectors, and primitive vs object reference allocation."
    }
  ],
  restapis: [
    {
      q: "What are the core RESTful design principles, and how do you handle versioning, idempotency, and rate limiting?",
      tip: "Explain statelessness, GET/POST/PUT/DELETE/PATCH semantics, Idempotency-Key headers, and HTTP status codes."
    }
  ]
};

// Generate smart fallback questions for any unlisted skill
function generateFallbackQuestions(skill) {
  const clean = skill.trim();
  return [
    {
      q: `How have you used ${clean} in production, and what were the key technical decisions you made?`,
      tip: `Highlight architecture design, data flow, error handling, and quantifiable results achieved with ${clean}.`
    },
    {
      q: `What are the common pitfalls or performance considerations when working with ${clean} at scale?`,
      tip: `Discuss debugging strategies, code maintainability, testing, and modern best practices in ${clean}.`
    }
  ];
}

function getQuestionsForSkill(skill) {
  const key = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (SKILL_QUESTION_BANK[key]) return SKILL_QUESTION_BANK[key];

  // Try substring search
  for (const [k, qs] of Object.entries(SKILL_QUESTION_BANK)) {
    if (key.includes(k) || k.includes(key)) {
      return qs;
    }
  }

  return generateFallbackQuestions(skill);
}

export function SkillQuestions({ skills = [], targetJob = '' }) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(0);

  if (!skills || skills.length === 0) return null;

  // Active skill (defaults to first skill or selected)
  const activeSkill = selectedSkill || skills[0];
  const questions = getQuestionsForSkill(activeSkill);

  return (
    <div className="skill-questions-wrapper">
      <div className="skill-q-header">
        <div className="skill-q-title">
          <MessageSquareCode size={18} className="skill-q-icon" />
          <div>
            <h4>Interview Questions for Your Detected Skills</h4>
            <p>Click any skill below to practice interview questions interviewers will ask you</p>
          </div>
        </div>
      </div>

      {/* ── Interactive Skill Selector Pills ── */}
      <div className="skill-selector-pills">
        {skills.map((skill, idx) => {
          const isSelected = skill === activeSkill;
          return (
            <button
              key={idx}
              className={`skill-pill-btn ${isSelected ? 'active-skill' : ''}`}
              onClick={() => {
                setSelectedSkill(skill);
                setExpandedIndex(0);
              }}
            >
              {skill}
              {isSelected && <span className="pill-dot" />}
            </button>
          );
        })}
      </div>

      {/* ── Active Skill Questions Display ── */}
      <div className="skill-questions-card">
        <div className="active-skill-banner">
          <span className="skill-badge-lg">{activeSkill}</span>
          <span className="q-count-badge">{questions.length} Practice Questions</span>
        </div>

        <div className="questions-accordion">
          {questions.map((item, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div key={idx} className={`skill-q-item ${isExpanded ? 'is-open' : ''}`}>
                <button
                  className="skill-q-trigger"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  aria-expanded={isExpanded}
                >
                  <span className="q-num-pill">Q{idx + 1}</span>
                  <span className="q-text">{item.q}</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded && (
                  <div className="skill-q-body">
                    <div className="tip-box">
                      <Lightbulb size={16} className="tip-bulb" />
                      <div>
                        <strong>What Interviewers Look For:</strong>
                        <p>{item.tip}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
