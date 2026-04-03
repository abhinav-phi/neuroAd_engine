import React, { memo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip } from
'recharts';
import { RewardBreakdown, StepHistoryEntry } from '../lib/types';
import { actionLabel } from '../lib/utils';
interface RewardStripProps {
  reward: number | null;
  breakdown: RewardBreakdown | null;
  rewardHistory: number[];
  stepHistory: StepHistoryEntry[];
  isCollapsed: boolean;
  onToggle: () => void;
}
function RewardChip({ label, value }: {label: string;value: number;}) {
  const isPos = value >= 0;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        background: isPos ? 'rgba(16,232,138,0.08)' : 'rgba(255,77,106,0.08)',
        border: `1px solid ${isPos ? 'rgba(16,232,138,0.25)' : 'rgba(255,77,106,0.25)'}`,
        borderRadius: 'var(--radius-pill)'
      }}>
      
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)'
        }}>
        
        {label}:
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 600,
          color: isPos ? 'var(--status-good)' : 'var(--status-bad)'
        }}>
        
        {isPos ? '+' : ''}
        {value.toFixed(3)}
      </span>
    </div>);

}
export function RewardStrip({
  reward,
  breakdown,
  rewardHistory,
  stepHistory,
  isCollapsed,
  onToggle
}: RewardStripProps) {
  const chartData = rewardHistory.map((r, i) => ({
    step: i + 1,
    reward: r
  }));
  const isPositive = reward !== null && reward >= 0;
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        transition: 'height var(--transition-med)'
      }}>
      
      {/* Toggle header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 20px',
          cursor: 'pointer',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)'
        }}
        onClick={onToggle}>
        
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
          
          Reward & History
        </span>
        {reward !== null &&
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 600,
            color: isPositive ? 'var(--status-good)' : 'var(--status-bad)',
            marginLeft: 4
          }}>
          
            {isPositive ? '+' : ''}
            {reward.toFixed(3)}
          </span>
        }
        <div
          style={{
            marginLeft: 'auto',
            color: 'var(--text-muted)'
          }}>
          
          {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {!isCollapsed &&
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr 280px',
          height: 150,
          overflow: 'hidden'
        }}>
        
          {/* Left: Current reward */}
          <div
          style={{
            padding: '12px 16px',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 8
          }}>
          
            <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
            
              Step Reward
            </div>
            {reward !== null ?
          <>
                <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 32,
                fontWeight: 600,
                color: isPositive ?
                'var(--status-good)' :
                'var(--status-bad)',
                lineHeight: 1,
                textShadow: isPositive ?
                '0 0 12px rgba(16,232,138,0.3)' :
                '0 0 12px rgba(255,77,106,0.3)'
              }}>
              
                  {isPositive ? '+' : ''}
                  {reward.toFixed(4)}
                </div>
                {breakdown &&
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4
              }}>
              
                    <RewardChip
                label="Attn Δ"
                value={breakdown.attentionDelta} />
              
                    <RewardChip label="Mem Δ" value={breakdown.memoryDelta} />
                    <RewardChip label="Load" value={breakdown.loadPenalty} />
                    <RewardChip label="Bonus" value={breakdown.bonus} />
                  </div>
            }
              </> :

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-muted)'
            }}>
            
                No steps yet
              </div>
          }
          </div>

          {/* Center: Reward trend */}
          <div
          style={{
            padding: '12px 16px',
            borderRight: '1px solid var(--border-subtle)'
          }}>
          
            <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 8
            }}>
            
              Reward Trend
            </div>
            {chartData.length > 0 ?
          <ResponsiveContainer width="100%" height={100}>
                <AreaChart
              data={chartData}
              margin={{
                top: 4,
                right: 4,
                bottom: 0,
                left: -20
              }}>
              
                  <defs>
                    <linearGradient id="rewardGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                    offset="5%"
                    stopColor="var(--accent-cyan)"
                    stopOpacity={0.3} />
                  
                      <stop
                    offset="95%"
                    stopColor="var(--accent-cyan)"
                    stopOpacity={0} />
                  
                    </linearGradient>
                  </defs>
                  <XAxis
                dataKey="step"
                tick={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8,
                  fill: 'var(--text-muted)'
                }}
                axisLine={false}
                tickLine={false} />
              
                  <YAxis hide />
                  <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const val = Number(payload[0].value);
                  return (
                    <div
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--text-primary)'
                      }}>
                      
                          Step {payload[0].payload.step}: {val >= 0 ? '+' : ''}
                          {val.toFixed(4)}
                        </div>);

                }} />
              
                  <Area
                type="monotone"
                dataKey="reward"
                stroke="var(--accent-cyan)"
                strokeWidth={1.5}
                fill="url(#rewardGrad)"
                isAnimationActive
                animationDuration={400}
                dot={false} />
              
                </AreaChart>
              </ResponsiveContainer> :

          <div
            style={{
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)'
            }}>
            
                No data yet
              </div>
          }
          </div>

          {/* Right: Step history */}
          <div
          style={{
            padding: '12px 16px',
            overflowY: 'auto'
          }}>
          
            <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 8
            }}>
            
              Step History
            </div>
            {stepHistory.length === 0 ?
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)'
            }}>
            
                No actions yet
              </div> :

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
            
                {stepHistory.slice(0, 8).map((entry, i) => {
              const isPos = entry.reward >= 0;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 6px',
                    background:
                    i % 2 === 0 ?
                    'transparent' :
                    'rgba(255,255,255,0.02)',
                    borderRadius: 4,
                    opacity: Math.max(0.4, 1 - i * 0.1)
                  }}>
                  
                      <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      flexShrink: 0
                    }}>
                    
                        S{entry.step}
                      </span>
                      <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--text-secondary)',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                    
                        {actionLabel(entry.action)}
                      </span>
                      <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      fontWeight: 600,
                      flexShrink: 0,
                      color: isPos ?
                      'var(--status-good)' :
                      'var(--status-bad)'
                    }}>
                    
                        {isPos ? '+' : ''}
                        {entry.reward.toFixed(3)}
                      </span>
                    </div>);

            })}
              </div>
          }
          </div>
        </div>
      }
    </div>);

}