// Copyright (C) 2017-2023 Smart code 203358507

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { MainNavBars, Button, ModalDialog, Image } from 'stremio/components';
import ModalX from '../../components/ModalX';
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

// Helpers
function normalizeUnixTimestamp(ts: number | undefined | null): number | null {
    if (!ts) return null;
    // If seconds (10 digits), convert to ms
    if (ts < 1e12) return ts * 1000;
    return ts;
}

// Streamed API functions
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(`${API_BASE}/api/sports`, { 
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            console.warn(`Sports API error: HTTP ${res.status}`);
            throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as StreamedSport[];
        if (json && Array.isArray(json)) {
            writeCache(sportsStorageKey, json);
            return json;
        }
        return json;
    } catch (e) {
        console.warn('Failed to fetch sports:', e);
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(`${API_BASE}/api/matches/${sportId}`, { 
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            console.warn(`Matches API error for sport ${sportId}: HTTP ${res.status}`);
            throw new Error(`HTTP ${res.status}`);
        }
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
        console.warn(`Failed to fetch matches for sport ${sportId}:`, e);
        return cached?.data ?? null;
    }
}

async function fetchLiveMatches(force = false): Promise<StreamedMatch[] | null> {
    const cached = readCache(storageKey);
    if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.data;
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(`${API_BASE}/api/matches/live`, { 
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            console.warn(`Live matches API error: HTTP ${res.status}`);
            throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as StreamedMatch[];
        const normalized = Array.isArray(json)
            ? json.map((m) => ({
                ...m,
                date: normalizeUnixTimestamp(m.date) || 0
            }))
            : json;
        if (normalized && Array.isArray(normalized)) {
            writeCache(storageKey, normalized);
            return normalized;
        }
        return normalized as any;
    } catch (e) {
        console.warn('Failed to fetch live matches:', e);
        return cached?.data ?? null;
    }
}

async function fetchStreams(source: string, id: string): Promise<StreamedStream[] | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(`${API_BASE}/api/stream/${source}/${id}`, { 
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            console.warn(`Streams API error for ${source}/${id}: HTTP ${res.status}`);
            throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as StreamedStream[];
        return json && Array.isArray(json) ? json : null;
    } catch (e) {
        console.warn(`Failed to fetch streams for ${source}/${id}:`, e);
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
    // Live if started within last 2 hours
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

    // Suppress benign/3rd-party errors that can block interactions in some environments
    useEffect(() => {
        const onError = (event: ErrorEvent) => {
            try {
                const msg = event?.message || '';
                if (
                    typeof msg === 'string' && (
                        msg.includes('qzqz is not defined') ||
                        msg.includes('ERR_BLOCKED_BY_CLIENT')
                    )
                ) {
                    event.preventDefault();
                    return false;
                }
            } catch {}
            return undefined as any;
        };
        const onRejection = (event: PromiseRejectionEvent) => {
            try {
                const reason: any = event?.reason;
                const msg = typeof reason === 'string' ? reason : (reason?.message || '');
                if (typeof msg === 'string' && /interrupted|AbortError/i.test(msg)) {
                    event.preventDefault();
                }
            } catch {}
        };
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);
        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
        };
    }, []);

    // Load AdGuard config
    useEffect(() => {
        const config = getAdGuardConfig();
        setAdGuardConfig(config);
    }, []);

    // Load sports and set default sport
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
        try {
            const res = await fetchMatchesBySport(selectedSport, force);
            if (res === null) {
                setError('Unable to load matches. The sports service may be temporarily unavailable.');
            } else {
                setError(null);
            }
            setMatches(res);
        } catch (err) {
            console.error('Error loading matches:', err);
            setError('Unable to load matches. Please check your connection and try again.');
            setMatches(null);
        }
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

    const now = Date.now();
    const allMatches = useMemo(() => matches ?? [], [matches]);

    const liveMatches = useMemo(() => allMatches.filter((m) => isLive(now, m)), [allMatches, now]);
    const upcomingMatches = useMemo(() => allMatches.filter((m) => isUpcoming(now, m)), [allMatches, now]);

    const handleSportChange = async (sportId: string) => {
        if (sportId === selectedSport) return;
        setSelectedSport(sportId);
    };

    const handleWatchClick = async (match: StreamedMatch) => {
        // Open in modal (as requested)
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

    const renderMatchCard = (match: StreamedMatch, isLiveMatch: boolean = false, isUpcomingMatch: boolean = false) => (
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

    return (
        <MainNavBars className={styles['sports-container']} route={'sports'} title={'SageStreams'}>
            <div className={classnames(styles['sports-content'], 'animation-fade-in')}>
                {/* Sports Navigation (no All Sports) */}
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

                {/* Content */}
                {loading ? (
                    <div className={styles['message']}>
                        <div className={styles['loading-spinner']}></div>
                        <div>Loading {sports?.find((s) => s.id === selectedSport)?.name || 'sports'} matches…</div>
                    </div>
                ) : error ? (
                    <div className={styles['message']}>
                        <div className={styles['error-icon']}>⚠️</div>
                        <div>{error}</div>
                        <Button 
                            className={styles['retry-button']} 
                            onClick={() => load(true)}
                        >
                            🔄 Try Again
                        </Button>
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

                        {upcomingMatches.length > 0 && (
                            <section className={styles['section']}>
                                <h2 className={styles['section-title']}>
                                    <span className={styles['upcoming-indicator']}>⏰</span>
                                    Upcoming ({upcomingMatches.length})
                                </h2>
                                <div className={styles['grid']}>
                                    {upcomingMatches.map((match) => renderMatchCard(match, false, true))}
                                </div>
                            </section>
                        )}

                        {liveMatches.length === 0 && upcomingMatches.length === 0 && allMatches.length > 0 && (
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

            <ModalX
                isOpen={!!selectedMatch}
                onClose={handleCloseModal}
                title={selectedMatch?.title}
                subtitle={selectedMatch?.category}
                size="xl"
            >
                {selectedMatch && (
                    <div>
                        {selectedMatch.sources && selectedMatch.sources.length > 0 && (
                            <div className={styles['source-selector']}>
                                <h3>Sources</h3>
                                <div className={styles['source-options']}>
                                    {selectedMatch.sources.map((source) => (
                                        <button
                                            key={source.source}
                                            className={classnames(styles['source-option'], {
                                                [styles['source-option-active']]: selectedSource === source.source
                                            })}
                                            onClick={() => handleSourceChange(source.source)}
                                        >
                                            {source.source.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {streamsLoading ? (
                            <div className={styles['stream-loading']}>
                                <div className={styles['loading-spinner']} />
                                <div>Loading streams…</div>
                            </div>
                        ) : selectedStreams && selectedStreams.length > 0 ? (
                            <>
                                {selectedStreams.length > 1 && (
                                    <div className={styles['stream-selector']}>
                                        <h3>Streams</h3>
                                        <div className={styles['stream-options']}>
                                            {selectedStreams.map((stream) => (
                                                <button
                                                    key={stream.id}
                                                    className={classnames(styles['stream-option'], {
                                                        [styles['stream-option-active']]: selectedStream?.id === stream.id
                                                    })}
                                                    onClick={() => handleStreamSelect(stream)}
                                                >
                                                    S{stream.streamNo} · {stream.language} · {stream.hd ? 'HD' : 'SD'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className={styles['iframe-container']}>
                                    {iframeLoading && (
                                        <div className={styles['iframe-loading']}>
                                            <div className={styles['loading-spinner']} />
                                            <div>Loading stream…</div>
                                        </div>
                                    )}
                                    {selectedStream && (
                                        <iframe
                                            className={styles['iframe']}
                                            src={selectedStream.embedUrl}
                                            title={selectedMatch.title}
                                            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                                            allowFullScreen
                                            onLoad={handleIframeLoad}
                                            style={{ opacity: iframeLoading ? 0 : 1 }}
                                        />
                                    )}
                                </div>

                                <div className={styles['stream-info']}>
                                    <div className={styles['stream-meta']}>
                                        {selectedMatch.category && (
                                            <div className={styles['stream-category']}>
                                                <span className={styles['category-icon']}>🏷️</span>
                                                <span>{selectedMatch.category}</span>
                                            </div>
                                        )}
                                        <div className={styles['stream-time']}>
                                            <span className={styles['time-icon']}>🕐</span>
                                            <span>{formatTime(selectedMatch.date)}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={styles['no-stream-message']}>
                                <div className={styles['no-stream-icon']}>⏳</div>
                                <h3>No streams available</h3>
                                <p>Please try another source or come back later.</p>
                            </div>
                        )}
                    </div>
                )}
            </ModalX>
        </MainNavBars>
    );
};

export default Sports;
