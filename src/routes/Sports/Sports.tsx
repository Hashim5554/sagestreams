// Copyright (C) 2017-2023 Smart code 203358507

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { MainNavBars, Button, Image } from 'stremio/components';
import styles from './Sports.less';

type StreamedMatch = {
    id: string;
    title: string;
    category: string;
    date: number;
    poster?: string;
    popular: boolean;
    teams?: {
        home?: {
            name: string;
            badge: string;
        };
        away?: {
            name: string;
            badge: string;
        };
    };
    sources: {
        source: string;
        id: string;
    }[];
};

type StreamedStream = {
    id: string;
    streamNo: number;
    language: string;
    hd: boolean;
    embedUrl: string;
    source: string;
};

type StreamedSport = {
    id: string;
    name: string;
};

import { getAdGuardConfig, AdGuardDNSConfig } from '../../common/adGuardAPI';

const API_BASE = 'https://streamed.pk';
const CACHE_TTL_MS = 60_000;

const storageKey = 'streamed_matches_cache_v1';
const sportsStorageKey = 'streamed_sports_cache_v1';
const LEAGUE_BADGES_KEY = 'league_badges_cache_v1';
const MATCH_LEAGUE_CACHE_KEY = 'match_league_cache_v1';

function normalizeUnixTimestamp(ts: number | undefined | null): number | null {
    if (!ts) return null;
    if (ts < 1e12) return ts * 1000;
    return ts;
}

function readCache(key: string): { at: number; data: any } | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeCache(key: string, data: any): void {
    try {
        localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
    } catch {}
}

async function fetchSports(force = false): Promise<StreamedSport[] | null> {
    const cached = readCache(sportsStorageKey);
    if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.data;
    }
    try {
        const res = await fetch(`${API_BASE}/api/sports`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as StreamedSport[];
        if (json && Array.isArray(json)) {
            writeCache(sportsStorageKey, json);
            return json;
        }
        return json;
    } catch (e) {
        return cached?.data ?? null;
    }
}

async function fetchMatchesBySport(sportId: string, force = false): Promise<StreamedMatch[] | null> {
    const cacheKey = `streamed_matches_${sportId}_v1`;
    const cached = readCache(cacheKey);
    if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.data;
    }
    try {
        const res = await fetch(`${API_BASE}/api/matches/${sportId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as StreamedMatch[];
        const normalized = Array.isArray(json)
            ? json.map((m) => ({
                ...m,
                date: normalizeUnixTimestamp(m.date) || 0
            }))
            : json;
        if (normalized && Array.isArray(normalized)) {
            writeCache(cacheKey, normalized);
            return normalized;
        }
        return normalized as any;
    } catch (e) {
        return cached?.data ?? null;
    }
}

async function fetchStreams(source: string, id: string): Promise<StreamedStream[] | null> {
    try {
        const res = await fetch(`${API_BASE}/api/stream/${source}/${id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as StreamedStream[];
        return json && Array.isArray(json) ? json : null;
    } catch (e) {
        return null;
    }
}

function formatTime(ts?: number): string {
    if (!ts) return '';
    try {
        const d = new Date(ts);
        return d.toLocaleString();
    } catch {
        return '';
    }
}

function isLive(now: number, match: StreamedMatch): boolean {
    const startTime = match.date;
    const currentTime = now;
    return startTime > 0 && currentTime >= startTime && currentTime <= startTime + (2 * 60 * 60 * 1000);
}

function isUpcoming(now: number, match: StreamedMatch): boolean {
    return match.date > now;
}

function getTimeRemaining(now: number, match: StreamedMatch): string {
    const startTime = match.date;
    const currentTime = now;
    
    if (currentTime < startTime) {
        const remaining = startTime - currentTime;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
        if (minutes > 0) return `Starts in ${minutes}m`;
        return 'Starting now';
    } else if (isLive(currentTime, match)) {
        const endTime = startTime + (2 * 60 * 60 * 1000);
        const remaining = endTime - currentTime;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours}h ${minutes}m left`;
        if (minutes > 0) return `${minutes}m left`;
        return 'Ending soon';
    }
    return 'Ended';
}

function getTeamBadgeUrl(badge: string): string {
    return `${API_BASE}/api/images/badge/${badge}.webp`;
}

function getPosterUrl(poster: string): string {
    return `${API_BASE}${poster}.webp`;
}

// TheSportsDB league badge resolver with caching
async function fetchLeagueBadge(leagueName: string): Promise<string | null> {
    if (!leagueName) return null;
    const cache = readCache(LEAGUE_BADGES_KEY) || { at: 0, data: {} };
    const cachedUrl = cache.data[leagueName];
    if (cachedUrl) return cachedUrl as string;

    try {
        const url = `https://www.thesportsdb.com/api/v1/json/1/searchleagues.php?l=${encodeURIComponent(leagueName)}`;
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error('Badge fetch failed');
        const json = await res.json();
        const league = json?.leagues && Array.isArray(json.leagues) ? json.leagues[0] : null;
        const badge = league?.strBadge || league?.strLogo || league?.strTrophy || null;
        if (badge) {
            const newData = { ...(cache.data || {}), [leagueName]: badge };
            writeCache(LEAGUE_BADGES_KEY, newData);
            return badge as string;
        }
    } catch {}
    return null;
}

// Resolve competition via TheSportsDB by team name
async function resolveCompetitionByTeam(teamName: string): Promise<string | null> {
    try {
        const url = `https://www.thesportsdb.com/api/v1/json/1/searchteams.php?t=${encodeURIComponent(teamName)}`;
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error('Team fetch failed');
        const json = await res.json();
        const team = json?.teams && Array.isArray(json.teams) ? json.teams[0] : null;
        const league: string | null = team?.strLeague || team?.strLeague2 || team?.strLeague3 || null;
        return league && typeof league === 'string' ? league : null;
    } catch {
        return null;
    }
}

const LeagueBadge: React.FC<{ name?: string }> = ({ name }) => {
    const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
    useEffect(() => {
        let ignore = false;
        (async () => {
            if (!name) return;
            const url = await fetchLeagueBadge(name);
            if (!ignore) setBadgeUrl(url);
        })();
        return () => { ignore = true; };
    }, [name]);
    if (!name) return null;
    return (
        <div className={styles['comp-badge-wrap']}>
            {badgeUrl ? (
                <img className={styles['comp-badge']} src={badgeUrl} alt={name} />
            ) : (
                <span className={styles['comp-badge-fallback']}>🏟️</span>
            )}
            <span className={styles['comp-name']}>{name}</span>
        </div>
    );
};

const Sports: React.FC = () => {
    const [sports, setSports] = useState<StreamedSport[] | null>(null);
    const [selectedSport, setSelectedSport] = useState<string>('');
    const [matches, setMatches] = useState<StreamedMatch[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMatch, setSelectedMatch] = useState<StreamedMatch | null>(null);
    const [selectedStreams, setSelectedStreams] = useState<StreamedStream[] | null>(null);
    const [streamsLoading, setStreamsLoading] = useState<boolean>(false);
    const [selectedStream, setSelectedStream] = useState<StreamedStream | null>(null);
    const [selectedSource, setSelectedSource] = useState<string>('');
    const [iframeLoading, setIframeLoading] = useState<boolean>(false);
    const [adGuardConfig, setAdGuardConfig] = useState<AdGuardDNSConfig | null>(null);
    const intervalRef = useRef<number | null>(null);

    // NEW: competition selection
    const [selectedCompetition, setSelectedCompetition] = useState<string>('');
    const [competitionByMatch, setCompetitionByMatch] = useState<Record<string, string>>(() => {
        const cached = readCache(MATCH_LEAGUE_CACHE_KEY);
        return (cached?.data as Record<string, string>) || {};
    });

    useEffect(() => {
        const config = getAdGuardConfig();
        setAdGuardConfig(config);
    }, []);

    useEffect(() => {
        const loadSports = async () => {
            const sportsData = await fetchSports();
            setSports(sportsData);
            if (sportsData && sportsData.length > 0) {
                setSelectedSport(sportsData[0].id);
            }
        };
        loadSports();
    }, []);

    const load = useCallback(async (force = false) => {
        if (!selectedSport) return;
        setError(null);
        setLoading(true);
        const res = await fetchMatchesBySport(selectedSport, force);
        if (res === null) {
            setError('Failed to load matches');
        }
        setMatches(res);
        setLoading(false);
    }, [selectedSport]);

    useEffect(() => {
        load(false);
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(() => load(false), 60_000);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
        };
    }, [load]);

    // Resolve competitions for visible matches and cache results
    useEffect(() => {
        const unresolved = (matches || []).filter((m) => !competitionByMatch[m.id]);
        if (unresolved.length === 0) return;
        let cancelled = false;
        (async () => {
            const updates: Record<string, string> = {};
            for (const m of unresolved) {
                const teamName = m.teams?.home?.name || m.teams?.away?.name || '';
                const fromTitle = !teamName && m.title ? m.title.split(/vs|VS|v\.|-/)[0]?.trim() : '';
                const query = teamName || fromTitle;
                if (!query) continue;
                const league = await resolveCompetitionByTeam(query);
                if (league) {
                    updates[m.id] = league;
                }
            }
            if (!cancelled && Object.keys(updates).length > 0) {
                setCompetitionByMatch((prev) => {
                    const next = { ...prev, ...updates };
                    writeCache(MATCH_LEAGUE_CACHE_KEY, next);
                    return next;
                });
            }
        })();
        return () => { cancelled = true; };
    }, [matches]);

    const now = Date.now();
    const allMatches = useMemo(() => matches ?? [], [matches]);

    // Get distinct competitions from data (by category)
    const competitions = useMemo(() => {
        const set = new Set<string>();
        for (const m of allMatches) {
            const cat = (m.category || '').trim();
            if (cat) set.add(cat);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allMatches]);

    // Initialize or reset selected competition on data change
    useEffect(() => {
        if (competitions.length > 0) {
            // Keep current selection if still present, else pick first
            setSelectedCompetition((prev) => (prev && competitions.includes(prev) ? prev : competitions[0]));
        } else {
            setSelectedCompetition('');
        }
    }, [competitions]);

    const liveMatches = useMemo(() => allMatches.filter((m) => isLive(now, m)), [allMatches, now]);

    // Upcoming filtered to the selected competition only
    const upcomingMatches = useMemo(() => {
        return allMatches.filter((m) => isUpcoming(now, m) && ((m.category || '').trim() === (selectedCompetition || '').trim()));
    }, [allMatches, now, selectedCompetition]);

    // Upcoming: single block list, sorted by (competition priority, time)
    const upcomingSorted = useMemo(() => {
        return [...upcomingMatches].sort((a, b) => {
            const nameA = a.category || '';
            const nameB = b.category || '';
            // Primary sort: competition name alphabetical
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            // Secondary sort: time
            return a.date - b.date;
        });
    }, [upcomingMatches]);

    // Compute separators when competition changes
    const upcomingWithSeparators = useMemo(() => {
        let prevCat: string | null = null;
        return upcomingSorted.map((m) => {
            const cat = (m.category || '').trim();
            const showSep = prevCat !== null && prevCat !== cat;
            prevCat = cat;
            return { match: m, showSep };
        });
    }, [upcomingSorted]);

    const handleSportChange = async (sportId: string) => {
        if (sportId === selectedSport) return;
        setSelectedSport(sportId);
    };

    const handleWatchClick = async (match: StreamedMatch) => {
        setSelectedMatch(match);
        setStreamsLoading(true);
        setSelectedStreams(null);
        setSelectedStream(null);
        setSelectedSource('');
        if (match.sources && match.sources.length > 0) {
            const source = match.sources[0];
            setSelectedSource(source.source);
            const streams = await fetchStreams(source.source, source.id);
            setSelectedStreams(streams);
            if (streams && streams.length > 0) {
                setSelectedStream(streams[0]);
                setIframeLoading(true);
            }
        }
        setStreamsLoading(false);
    };

    const handleSourceChange = async (source: string) => {
        if (!selectedMatch) return;
        setStreamsLoading(true);
        setSelectedSource(source);
        const sourceObj = selectedMatch.sources.find((s) => s.source === source);
        if (sourceObj) {
            const streams = await fetchStreams(sourceObj.source, sourceObj.id);
            setSelectedStreams(streams);
            if (streams && streams.length > 0) {
                setSelectedStream(streams[0]);
                setIframeLoading(true);
            }
        }
        setStreamsLoading(false);
    };

    const handleStreamSelect = (stream: StreamedStream) => {
        setSelectedStream(stream);
        setIframeLoading(true);
    };

    const handleIframeLoad = () => setIframeLoading(false);

    const handleCloseModal = () => {
        setSelectedMatch(null);
        setSelectedStreams(null);
        setSelectedStream(null);
        setSelectedSource('');
        setIframeLoading(false);
        setStreamsLoading(false);
    };

    const renderMatchCard = (match: StreamedMatch, isLiveMatch: boolean = false, isUpcomingMatch: boolean = false) => {
        const compName = competitionByMatch[match.id] || match.category;
        return (
            <div key={match.id} className={styles['card']}>
                <div className={styles['poster']}>
                    {match.poster ? (
                        <img
                            className={styles['poster-img']}
                            src={getPosterUrl(match.poster)}
                            alt={match.title}
                            onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.parentElement?.querySelector('.poster-fallback') as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                            }}
                        />
                    ) : (
                        <div className={styles['poster-fallback']} />
                    )}
                    {isLiveMatch && <div className={styles['badge-live']}>LIVE</div>}
                    {isUpcomingMatch && <div className={styles['badge-upcoming']}>SOON</div>}
                    <div className={styles['time-remaining']}>{getTimeRemaining(now, match)}</div>
                </div>
                <div className={styles['card-body']}>
                    {isLiveMatch && compName && (
                        <div className={styles['card-subtitle']}>
                            <LeagueBadge name={compName} />
                        </div>
                    )}
                    <div className={styles['card-title']}>{match.title}</div>
                    {match.teams && (
                        <div className={styles['card-teams']}>
                            {match.teams.home && (
                                <div className={styles['team']}>
                                    <img
                                        className={styles['team-badge']}
                                        src={getTeamBadgeUrl(match.teams.home.badge)}
                                        alt={match.teams.home.name}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    <span className={styles['team-name']}>{match.teams.home.name}</span>
                                </div>
                            )}
                            <span className={styles['vs']}>vs</span>
                            {match.teams.away && (
                                <div className={styles['team']}>
                                    <img
                                        className={styles['team-badge']}
                                        src={getTeamBadgeUrl(match.teams.away.badge)}
                                        alt={match.teams.away.name}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    <span className={styles['team-name']}>{match.teams.away.name}</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className={styles['time']}>{formatTime(match.date)}</div>
                    <Button className={styles['watch-button']} onClick={() => handleWatchClick(match)}>
                        <span className={styles['watch-icon']}>▶️</span>
                        {isLiveMatch ? 'Watch Live' : 'Watch'}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <MainNavBars className={styles['sports-container']} route={'sports'} title={'SageStreams'}>
            <div className={classnames(styles['sports-content'], 'animation-fade-in')}>
                {sports && sports.length > 0 && (
                    <div className={styles['sports-navigation']}>
                        <div className={styles['sports-tabs']}>
                            {sports.map((sport) => (
                                <Button
                                    key={sport.id}
                                    className={classnames(styles['sport-tab'], {
                                        [styles['sport-tab-active']]: selectedSport === sport.id
                                    })}
                                    onClick={() => handleSportChange(sport.id)}
                                >
                                    {sport.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* NEW: competition selector */}
                {competitions.length > 0 && (
                    <div className={styles['competition-bar']}>
                        <div className={styles['competition-left']}>
                            <LeagueBadge name={selectedCompetition} />
                        </div>
                        <div className={styles['competition-tabs']}>
                            {competitions.map((comp) => (
                                <button
                                    key={comp}
                                    className={classnames(styles['comp-tab'], {
                                        [styles['comp-tab-active']]: comp === selectedCompetition
                                    })}
                                    onClick={() => setSelectedCompetition(comp)}
                                >
                                    {comp}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className={styles['message']}>
                        <div className={styles['loading-spinner']}></div>
                        <div>Loading {sports?.find((s) => s.id === selectedSport)?.name || 'sports'} matches…</div>
                    </div>
                ) : error ? (
                    <div className={styles['message']}>
                        <div className={styles['error-icon']}>⚠️</div>
                        <div>{error}</div>
                    </div>
                ) : !matches || allMatches.length === 0 ? (
                    <div className={styles['message']}>
                        <div className={styles['empty-icon']}>🏟️</div>
                        <div>No matches available for {sports?.find((s) => s.id === selectedSport)?.name || 'this sport'}</div>
                    </div>
                ) : (
                    <>
                        {liveMatches.length > 0 && (
                            <section className={styles['section']}>
                                <h2 className={styles['section-title']}>
                                    <span className={styles['live-dot']} />
                                    Live Now ({liveMatches.length})
                                </h2>
                                <div className={styles['grid']}>
                                    {liveMatches.map((match) => renderMatchCard(match, true))}
                                </div>
                            </section>
                        )}

                        {upcomingSorted.length > 0 && (
                            <section className={styles['section']}>
                                <h2 className={styles['section-title']}>
                                    <span className={styles['upcoming-indicator']}>⏰</span>
                                    Upcoming — <span className={styles['inline-league']}><LeagueBadge name={selectedCompetition} /></span>
                                </h2>
                                <div className={styles['upcoming-list']}>
                                    {upcomingSorted.map((match, idx) => (
                                        <div key={match.id} className={styles['upcoming-row']}>
                                            {idx > 0 && <div className={styles['separator-line']}></div>}
                                            <div className={styles['upcoming-left']}>
                                                <div className={styles['comp-mini']}><LeagueBadge name={match.category} /></div>
                                            </div>
                                            <div className={styles['upcoming-middle']}>
                                                <div className={styles['upcoming-title']}>{match.title}</div>
                                                <div className={styles['upcoming-time']}>{formatTime(match.date)} · {getTimeRemaining(now, match)}</div>
                                            </div>
                                            <div className={styles['upcoming-right']}>
                                                <Button className={styles['watch-button']} onClick={() => handleWatchClick(match)}>
                                                    <span className={styles['watch-icon']}>▶️</span>
                                                    Watch
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {liveMatches.length === 0 && upcomingSorted.length === 0 && allMatches.length > 0 && (
                            <section className={styles['section']}>
                                <h2 className={styles['section-title']}>
                                    <span className={styles['ended-indicator']}>🏁</span>
                                    Recent Matches
                                </h2>
                                <div className={styles['grid']}>
                                    {allMatches.slice(0, 12).map((match) => renderMatchCard(match))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>

            {/* Custom modal overlay remains */}
            {selectedMatch && (
                <div className={styles['overlay']} role="dialog" aria-modal="true">
                    <div className={styles['overlay-backdrop']} onClick={handleCloseModal} />
                    <div className={styles['overlay-dialog']}>
                        <div className={styles['overlay-header']}>
                            <div className={styles['overlay-title-wrap']}>
                                <div className={styles['overlay-title']}>{selectedMatch.title}</div>
                                {selectedMatch.category && (
                                    <div className={styles['overlay-subtitle']}>
                                        <LeagueBadge name={selectedMatch.category} />
                                    </div>
                                )}
                            </div>
                            <button className={styles['overlay-close']} onClick={handleCloseModal} aria-label="Close">✕</button>
                        </div>
                        <div className={styles['overlay-body']}>
                            {selectedMatch.sources && selectedMatch.sources.length > 0 && (
                                <div className={styles['overlay-sources']}>
                                    {selectedMatch.sources.map((source) => (
                                        <button
                                            key={source.source}
                                            className={classnames(styles['chip'], {
                                                [styles['chip-active']]: selectedSource === source.source
                                            })}
                                            onClick={() => handleSourceChange(source.source)}
                                        >
                                            {source.source.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {streamsLoading ? (
                                <div className={styles['overlay-loading']}>
                                    <div className={styles['loading-spinner']} />
                                    <div>Loading streams…</div>
                                </div>
                            ) : selectedStreams && selectedStreams.length > 0 ? (
                                <>
                                    {selectedStreams.length > 1 && (
                                        <div className={styles['overlay-streams']}>
                                            {selectedStreams.map((stream) => (
                                                <button
                                                    key={stream.id}
                                                    className={classnames(styles['chip'], {
                                                        [styles['chip-active']]: selectedStream?.id === stream.id
                                                    })}
                                                    onClick={() => handleStreamSelect(stream)}
                                                >
                                                    S{stream.streamNo} · {stream.language} · {stream.hd ? 'HD' : 'SD'}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className={styles['overlay-player']}>
                                        {iframeLoading && (
                                            <div className={styles['overlay-player-loading']}>
                                                <div className={styles['loading-spinner']} />
                                                <div>Loading stream…</div>
                                            </div>
                                        )}
                                        {selectedStream && (
                                            <iframe
                                                className={styles['overlay-iframe']}
                                                src={selectedStream.embedUrl}
                                                title={selectedMatch.title}
                                                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                                                allowFullScreen
                                                onLoad={handleIframeLoad}
                                                style={{ opacity: iframeLoading ? 0 : 1 }}
                                            />
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className={styles['overlay-empty']}>
                                    <div className={styles['no-stream-icon']}>⏳</div>
                                    <div>No streams available for this match.</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </MainNavBars>
    );
};

export default Sports;
