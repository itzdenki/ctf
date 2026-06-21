/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trophy, Award, Search, Calendar, ChevronUp, UserCheck, Shield, BarChart3, Activity } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  Cell, 
  AreaChart, 
  Area, 
  ComposedChart,
  Line,
  LineChart
} from 'recharts';
import { Challenge, Team } from '../types';

interface ScoreboardViewProps {
  teams: Team[];
  currentUser: Team | null;
  challenges: Challenge[];
}

export default function ScoreboardView({ teams, currentUser, challenges }: ScoreboardViewProps) {
  const [chartRange, setChartRange] = useState<'top10' | 'all'>('top10');
  const [metricType, setMetricType] = useState<'both' | 'score' | 'solved'>('both');
  const [chartView, setChartView] = useState<'timeline' | 'distribution'>('timeline');

  // Sort teams dynamically by score (descending), then by last solve time (ascending/earlier is better) if scores equal.
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // If scores equal, earlier lastSolveTime takes precedence
    const aTime = a.lastSolveTime ? new Date(a.lastSolveTime).getTime() : Infinity;
    const bTime = b.lastSolveTime ? new Date(b.lastSolveTime).getTime() : Infinity;
    return aTime - bTime;
  });

  // Prepare chart data based on range
  const rawChartData = sortedTeams.map(team => ({
    name: team.name,
    score: team.score,
    solved: team.solvedChallengeIds.length,
    isMe: currentUser?.id === team.id
  }));

  const chartData = chartRange === 'top10' ? rawChartData.slice(0, 10) : rawChartData;

  // Timeline X-Axis Formatter
  const formatXAxisTime = (timeMs: number) => {
    const d = new Date(timeMs);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const top10Teams = sortedTeams.slice(0, 10);

  const getChPoints = (chId: string) => {
    const ch = challenges.find(c => c.id === chId);
    return ch ? ch.points : 100;
  };

  // Build timelines for the top 10
  const top10SolveEvents: { teamId: string; teamName: string; time: number; points: number }[] = [];
  let earliestSolveTime = Date.now();

  top10Teams.forEach(team => {
    const timestamps = team.solveTimestamps || {};
    team.solvedChallengeIds.forEach(chId => {
      const timeStr = timestamps[chId];
      if (timeStr) {
        const timeMs = new Date(timeStr).getTime();
        earliestSolveTime = Math.min(earliestSolveTime, timeMs);
        top10SolveEvents.push({
          teamId: team.id,
          teamName: team.name,
          time: timeMs,
          points: getChPoints(chId)
        });
      }
    });
  });

  top10SolveEvents.sort((a, b) => a.time - b.time);

  const timelineData: any[] = [];
  if (top10SolveEvents.length > 0) {
    const baseTime = earliestSolveTime - 2 * 60 * 60 * 1000; // 2 hours padding
    
    const initialPoint: any = {
      time: baseTime,
      formattedTime: 'Start',
    };
    top10Teams.forEach(t => {
      initialPoint[t.name] = 0;
    });
    timelineData.push(initialPoint);

    const runningScores: { [teamName: string]: number } = {};
    top10Teams.forEach(t => {
      runningScores[t.name] = 0;
    });

    top10SolveEvents.forEach(event => {
      runningScores[event.teamName] = (runningScores[event.teamName] || 0) + event.points;
      const dataPoint: any = {
        time: event.time,
        formattedTime: formatXAxisTime(event.time),
      };
      top10Teams.forEach(t => {
        dataPoint[t.name] = runningScores[t.name] || 0;
      });
      timelineData.push(dataPoint);
    });
  }

  const lineColors = [
    '#22d3ee', // Cyan
    '#f43f5e', // Rose
    '#10b981', // Emerald
    '#a855f7', // Purple
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#ec4899', // Pink
    '#eab308', // Yellow
    '#14b8a6', // Teal
    '#f97316'  // Orange
  ];

  // Sorted Custom Tooltip for Timeline
  const TimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
      return (
        <div className="bg-[#0a0c10] border border-cyan-500/35 p-3 rounded-sm shadow-[0_0_15px_rgba(6,182,212,0.2)] font-mono text-xs min-w-[200px] max-h-60 overflow-y-auto">
          <p className="text-cyan-400 font-bold mb-1.5 border-b border-cyan-500/10 pb-1">
            ⏱️ {label}
          </p>
          <div className="space-y-1">
            {sortedPayload.map((entry: any, index: number) => {
              const matchesUser = currentUser?.name === entry.name;
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <span style={{ color: entry.color }} className={`font-semibold ${matchesUser ? 'underline' : ''}`}>
                    {entry.name}
                  </span>
                  <span className="text-white font-bold">
                    {entry.value} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip component matching cyberpunk aesthetic
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0a0c10] border border-cyan-500/30 p-3 rounded-sm shadow-[0_0_15px_rgba(6,182,212,0.15)] font-mono text-xs">
          <p className="text-white font-bold mb-1.5 border-b border-cyan-500/10 pb-1 flex items-center justify-between gap-4">
            <span>{label}</span>
            {payload[0]?.payload?.isMe && (
              <span className="text-[9px] bg-cyan-500 text-black px-1 font-sans rounded-xs">MY TEAM</span>
            )}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="font-semibold text-xs mt-0.5">
              {entry.name === 'score' ? 'Điểm số: ' : 'Đã giải: '}
              <span className="text-white font-bold">
                {entry.value} {entry.name === 'score' ? 'pts' : 'challs'}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Page Title & Headings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyan-500/20 pb-4 gap-4">
        <div className="space-y-1 font-mono">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Trophy className="h-5 w-5" />
            <h1 className="text-lg font-bold tracking-wide text-white uppercase sm:text-xl">BẢNG XẾP HẠNG (SCOREBOARD)</h1>
          </div>
          <p className="text-gray-400 text-xs font-sans normal-case">
            Xếp hạng của tất cả các đội thi cập nhật theo thời gian thực (real-time). Khi điểm bằng nhau, đội hoàn thành bài thi sớm hơn sẽ xếp trên.
          </p>
        </div>

        {/* Mini stats highlights */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="bg-[#080a0e] border border-cyan-500/10 px-3 py-2 rounded-sm">
            <span className="text-gray-500 block uppercase">Tổng Số Đội</span>
            <span className="text-white font-bold text-sm block mt-0.5">{sortedTeams.length} Đội thi</span>
          </div>
          
          <div className="bg-[#080a0e] border border-cyan-500/10 px-3 py-2 rounded-sm">
            <span className="text-gray-500 block uppercase">Cao Nhất</span>
            <span className="text-cyan-400 font-bold text-sm block mt-0.5">
              {sortedTeams[0]?.score || 0} pts
            </span>
          </div>
        </div>
      </div>

      {/* Top 3 podium overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {sortedTeams.slice(0, 3).map((team, index) => {
          const isGold = index === 0;
          const isSilver = index === 1;
          const isBronze = index === 2;
          const isMe = currentUser?.id === team.id;

          return (
            <div 
              key={team.id}
              className={`p-6 rounded-sm border relative overflow-hidden transition-all bg-[#080a0e] ${
                isMe ? 'border-cyan-500 cyan-glow' : 'border-cyan-500/20'
              }`}
            >
              {/* Rank indicator badge */}
              <div className={`absolute top-4 right-4 text-3xl font-extrabold font-mono opacity-20 ${
                isGold ? 'text-yellow-400' : isSilver ? 'text-slate-300' : 'text-amber-500'
              }`}>
                #{index + 1}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-sm ${
                    isGold ? 'text-yellow-400 bg-yellow-500/10' : isSilver ? 'text-slate-300 bg-slate-500/10' : 'text-amber-500 bg-amber-600/10'
                  }`}>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 font-mono">
                      {index === 0 ? 'Hạng Nhất' : index === 1 ? 'Hạng Nhì' : 'Hạng Ba'}
                    </span>
                    <h3 className="text-white font-mono font-bold tracking-tight text-base truncate max-w-[160px] flex items-center gap-1">
                      {team.name}
                      {isMe && <span className="text-[9px] bg-cyan-500 text-black font-mono px-1 rounded-sm">MINE</span>}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-cyan-500/10 pt-3 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 block">ĐIỂM SỐ</span>
                    <span className={`text-lg font-bold ${isGold ? 'text-yellow-400' : 'text-cyan-400'}`}>{team.score} pts</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">CHALLENGES</span>
                    <span className="text-slate-300 font-bold block mt-0.5">{team.solvedChallengeIds.length} Solved</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics & Performance Charts Card */}
      <div className="bg-[#080a0e] border border-cyan-500/20 rounded-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-cyan-500/10 pb-4">
          <div className="flex items-center space-x-2.5 font-mono">
            <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 rounded-sm">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">PHÂN TÍCH HIỆU SUẤT ĐẤU TRƯỜNG</h2>
              <span className="text-[10px] text-gray-500 font-sans block">
                {chartView === 'timeline' 
                  ? 'Biểu đồ biểu diễn dòng chảy tích luỹ điểm số theo thời gian của Top 10' 
                  : 'Biểu đồ bento so sánh điểm số và số câu hỏi đã chinh phục của các đội'}
              </span>
            </div>
          </div>

          {/* Chart Options / Controllers */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase font-bold">
            {/* View Type Toggle */}
            <div className="flex bg-[#050608] border border-cyan-500/15 rounded-sm p-0.5">
              <button
                onClick={() => setChartView('timeline')}
                className={`px-3 py-1 rounded-sm transition-all cursor-pointer ${
                  chartView === 'timeline' ? 'bg-cyan-500 text-black font-extrabold' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Dòng thời gian (Timeline)
              </button>
              <button
                onClick={() => setChartView('distribution')}
                className={`px-3 py-1 rounded-sm transition-all cursor-pointer ${
                  chartView === 'distribution' ? 'bg-cyan-500 text-black font-extrabold' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Xếp hạng (Ranks Bar)
              </button>
            </div>

            {/* Sub-controllers ONLY for distribution view */}
            {chartView === 'distribution' && (
              <>
                {/* Metric Selector */}
                <div className="flex bg-[#050608] border border-cyan-500/15 rounded-sm p-0.5">
                  <button
                    onClick={() => setMetricType('both')}
                    className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                      metricType === 'both' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Cả hai
                  </button>
                  <button
                    onClick={() => setMetricType('score')}
                    className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                      metricType === 'score' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Chỉ điểm
                  </button>
                  <button
                    onClick={() => setMetricType('solved')}
                    className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                      metricType === 'solved' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Chỉ câu giải
                  </button>
                </div>

                {/* Range Selector */}
                <div className="flex bg-[#050608] border border-cyan-500/15 rounded-sm p-0.5">
                  <button
                    onClick={() => setChartRange('top10')}
                    className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                      chartRange === 'top10' ? 'bg-cyan-500 text-black font-extrabold' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Top 10
                  </button>
                  <button
                    onClick={() => setChartRange('all')}
                    className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                      chartRange === 'all' ? 'bg-cyan-500 text-black font-extrabold' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Tất cả ({sortedTeams.length})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart canvas wrap */}
        {sortedTeams.length > 0 ? (
          <div className="w-full h-80 min-h-[300px] select-none">
            {chartView === 'timeline' ? (
              timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 15, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(6, 182, 212, 0.05)" />
                    <XAxis 
                      dataKey="formattedTime" 
                      stroke="rgba(156, 163, 175, 0.4)" 
                      fontSize={10} 
                      tickLine={false}
                      fontFamily="monospace"
                    />
                    <YAxis 
                      stroke="rgba(6, 182, 212, 0.6)" 
                      fontSize={10}
                      tickLine={false}
                      fontFamily="monospace"
                    />
                    <Tooltip content={<TimelineTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '10px' }}
                      verticalAlign="bottom"
                      height={35}
                    />
                    {top10Teams.map((team, idx) => (
                      <Line
                        key={team.id}
                        type="monotone"
                        dataKey={team.name}
                        stroke={lineColors[idx % lineColors.length]}
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#080a0e', strokeWidth: 1.5 }}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center font-mono border border-dashed border-cyan-500/10">
                  <BarChart3 className="h-8 w-8 text-cyan-500/20 mb-2 animate-pulse" />
                  <span className="text-xs text-gray-500">Chưa ghi nhận lượt giải câu hỏi nào để lên đồ thị thời gian</span>
                </div>
              )
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.03}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(6, 182, 212, 0.05)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(156, 163, 175, 0.4)" 
                    fontSize={10} 
                    tickLine={false}
                    fontFamily="monospace"
                  />
                  
                  {(metricType === 'both' || metricType === 'score') && (
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      stroke="rgba(6, 182, 212, 0.6)" 
                      fontSize={10}
                      tickLine={false}
                      fontFamily="monospace"
                    />
                  )}
                  
                  {metricType === 'both' ? (
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="rgba(245, 158, 11, 0.6)" 
                      fontSize={10}
                      tickLine={false}
                      fontFamily="monospace"
                    />
                  ) : metricType === 'solved' ? (
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      stroke="rgba(245, 158, 11, 0.6)" 
                      fontSize={10}
                      tickLine={false}
                      fontFamily="monospace"
                    />
                  ) : null}

                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.02)' }} />
                  
                  <Legend 
                    wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }}
                    verticalAlign="bottom"
                    height={30}
                  />

                  {(metricType === 'both' || metricType === 'score') && (
                    <Bar 
                      yAxisId="left" 
                      dataKey="score" 
                      name="Điểm Số (Points)" 
                      fill="url(#colorScore)" 
                      radius={[1, 1, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isMe ? '#22d3ee' : 'rgba(6, 182, 212, 0.25)'} 
                          stroke={entry.isMe ? '#22d3ee' : 'rgba(6, 182, 212, 0.5)'}
                          strokeWidth={entry.isMe ? 1.5 : 1}
                        />
                      ))}
                    </Bar>
                  )}

                  {(metricType === 'both' || metricType === 'solved') && (
                    <Line 
                      yAxisId={metricType === 'both' ? 'right' : 'left'} 
                      type="monotone" 
                      dataKey="solved" 
                      name="Đã Giải (Solves)" 
                      stroke="#f59e0b" 
                      strokeWidth={1.5}
                      dot={{ r: 2.5, stroke: '#f59e0b', strokeWidth: 1.5, fill: '#080a0e' }}
                      activeDot={{ r: 4 }} 
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          <div className="h-60 border border-dashed border-cyan-500/10 flex flex-col items-center justify-center font-mono">
            <BarChart3 className="h-8 w-8 text-cyan-500/20 mb-2 animate-pulse" />
            <span className="text-xs text-gray-500">Chưa đủ dữ liệu để mô phỏng biểu đồ thống kê</span>
          </div>
        )}
      </div>

      {/* Main scoreboard table list */}
      <div className="bg-[#080a0e] border border-cyan-500/20 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0a0c10] border-b border-cyan-500/15 text-xs font-mono font-bold tracking-wider text-gray-400">
                <th className="py-3.5 px-6 w-20 text-center">RANK</th>
                <th className="py-3.5 px-4">TÊN ĐỘI (TEAM NAME)</th>
                <th className="py-3.5 px-4 text-center">SOLVED CHALLS</th>
                <th className="py-3.5 px-4 text-center">ĐIỂM SỐ (SCORE)</th>
                <th className="py-3.5 px-6 text-right">LƯỢT GIẢI GẦN NHẤT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10 text-sm font-mono">
              {sortedTeams.map((team, index) => {
                const isMe = currentUser?.id === team.id;
                const isTop3 = index < 3;
                
                return (
                  <tr 
                    key={team.id}
                    className={`transition-colors hover:bg-white/5 ${
                      isMe ? 'bg-cyan-500/5 hover:bg-cyan-500/10' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded-sm text-xs leading-none ${
                        isTop3 
                          ? index === 0 
                            ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                            : index === 1
                              ? 'bg-slate-300/15 text-slate-300 border border-slate-300/20'
                              : 'bg-amber-600/10 text-amber-500 border border-amber-600/20'
                          : 'text-gray-400'
                      }`}>
                        {index + 1}
                      </span>
                    </td>

                    {/* Team name */}
                    <td className="py-4 px-4 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span className={`block truncate ${isMe ? 'text-cyan-400 font-bold' : ''}`}>
                          {team.name}
                        </span>
                        
                        {isMe && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-sans font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-sm">
                            <UserCheck className="h-2.5 w-2.5" />
                            <span>My Team</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Challenges Solved */}
                    <td className="py-4 px-4 text-center text-gray-400 font-bold">
                      <span className="text-slate-300 font-semibold">{team.solvedChallengeIds.length}</span>
                      <span className="text-xs text-gray-600 font-normal"> / {team.solvedChallengeIds.length > 0 ? 'solved' : 'solves'}</span>
                    </td>

                    {/* Score */}
                    <td className="py-4 px-4 text-center">
                      <span className="text-cyan-400 font-bold text-base cyan-text-glow">{team.score}</span>
                    </td>

                    {/* Last Solve Time */}
                    <td className="py-4 px-6 text-right text-xs text-gray-400">
                      {team.lastSolveTime ? (
                        <div className="space-y-0.5">
                          <span>{new Date(team.lastSolveTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span className="block text-[10px] text-gray-500">
                            {new Date(team.lastSolveTime).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-700 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
