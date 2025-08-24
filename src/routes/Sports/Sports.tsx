// Copyright (C) 2017-2023 Smart code 203358507

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { MainNavBars, Button, ModalDialog, Image } from 'stremio/components';
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
        if (json && Array.isArray(json)) {
            writeCache(cacheKey, json);
            return json;
        }
        return json;
    } catch (e) {
        return cached?.data ?? null;
    }
}

async function fetchLiveMatches(force = false): Promise<StreamedMatch[] | null> {
    const cached = readCache(storageKey);
    if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.data;
    }
    try {
        const res = await fetch(`${API_BASE}/api/matches/live`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as StreamedMatch[];
        if (json && Array.isArray(json)) {
            writeCache(storageKey, json);
            return json;
        }
        return json;
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
    // A match is live if it started within the last 2 hours and hasn't ended
    const startTime = match.date;
    const currentTime = now;
    
    // Match is live if it started within the last 2 hours
    return currentTime >= startTime && currentTime <= startTime + (2 * 60 * 60 * 1000);
}

function isUpcoming(now: number, match: StreamedMatch): boolean {
    return match.date > now;
}

function getTimeRemaining(now: number, match: StreamedMatch): string {
    const startTime = match.date;
    const currentTime = now;
    
    if (currentTime < startTime) {
        // Upcoming match
        const remaining = startTime - currentTime;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `Starts in ${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `Starts in ${minutes}m`;
        } else {
            return 'Starting now';
        }
    } else if (isLive(currentTime, match)) {
        // Live match
        const endTime = startTime + (2 * 60 * 60 * 1000); // 2 hours after start
        const remaining = endTime - currentTime;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m left`;
        } else if (minutes > 0) {
            return `${minutes}m left`;
        } else {
            return 'Ending soon';
        }
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
    const [selectedSport, setSelectedSport] = useState<string>('all');
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

    // Load AdGuard config on component mount
    useEffect(() => {
        const config = getAdGuardConfig();
        setAdGuardConfig(config);
    }, []);

    // Load sports on component mount
    useEffect(() => {
        const loadSports = async () => {
            const sportsData = await fetchSports();
            setSports(sportsData);
        };
        loadSports();
    }, []);

    const load = useCallback(async (force = false) => {
        setError(null);
        setLoading(true);
        
        let res: StreamedMatch[] | null = null;
        
        if (selectedSport === 'all') {
            res = await fetchLiveMatches(force);
        } else {
            res = await fetchMatchesBySport(selectedSport, force);
        }
        
        if (res === null) {
            setError('Failed to load matches');
        }
        setMatches(res);
        setLoading(false);
    }, [selectedSport]);

    useEffect(() => {
        load(false);
        intervalRef.current = window.setInterval(() => load(false), 60_000);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
        };
    }, [load]);

    const now = Date.now();
    const allMatches = useMemo(() => matches ?? [], [matches]);

    const liveMatches = useMemo(() => {
        return allMatches.filter(match => isLive(now, match));
    }, [allMatches, now]);

    const upcomingMatches = useMemo(() => {
        return allMatches.filter(match => isUpcoming(now, match));
    }, [allMatches, now]);

    const handleSportChange = async (sportId: string) => {
        setSelectedSport(sportId);
        setLoading(true);
        setError(null);
        
        let res: StreamedMatch[] | null = null;
        
        if (sportId === 'all') {
            res = await fetchLiveMatches(true);
        } else {
            res = await fetchMatchesBySport(sportId, true);
        }
        
        if (res === null) {
            setError('Failed to load matches');
        }
        setMatches(res);
        setLoading(false);
    };

    const handleWatchClick = async (match: StreamedMatch) => {
        setSelectedMatch(match);
        setStreamsLoading(true);
        setSelectedStreams(null);
        setSelectedStream(null);
        setSelectedSource('');
        
        // Try to get streams for the first available source
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
        
        // Find the source object
        const sourceObj = selectedMatch.sources.find(s => s.source === source);
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

    const handleIframeLoad = () => {
        setIframeLoading(false);
    };

    const handleCloseModal = () => {
        setSelectedMatch(null);
        setSelectedStreams(null);
        setSelectedStream(null);
        setSelectedSource('');
        setIframeLoading(false);
        setStreamsLoading(false);
    };

    const renderMatchCard = (match: StreamedMatch, isLive: boolean = false, isUpcoming: boolean = false) => (
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
                {isLive && <div className={styles['badge-live']}>LIVE</div>}
                {isUpcoming && <div className={styles['badge-upcoming']}>SOON</div>}
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
                    {isLive ? 'Watch Live' : 'Watch'}
                </Button>
            </div>
        </div>
    );

    return (
        <MainNavBars className={styles['sports-container']} route={'sports'} title={'SageStreams'}>
            <div className={classnames(styles['sports-content'], 'animation-fade-in')}>
                {/* Sports Navigation */}
                {sports && (
                    <div className={styles['sports-navigation']}>
                        <div className={styles['sports-tabs']}>
                            <Button
                                className={classnames(styles['sport-tab'], {
                                    [styles['sport-tab-active']]: selectedSport === 'all'
                                })}
                                onClick={() => handleSportChange('all')}
                            >
                                🏆 All Sports
                            </Button>
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
                        <div>Loading {selectedSport === 'all' ? 'live sports' : `${sports?.find(s => s.id === selectedSport)?.name || 'sports'} matches`}…</div>
                    </div>
                ) : error ? (
                    <div className={styles['message']}>
                        <div className={styles['error-icon']}>⚠️</div>
                        <div>{error}</div>
                    </div>
                ) : !matches || allMatches.length === 0 ? (
                    <div className={styles['message']}>
                        <div className={styles['empty-icon']}>🏟️</div>
                        <div>No matches available for {selectedSport === 'all' ? 'live sports' : `${sports?.find(s => s.id === selectedSport)?.name || 'this sport'}`}</div>
                    </div>
                ) : (
                    <>
                        {liveMatches.length > 0 && (
                            <section className={styles['section']}>
                                <h2 className={styles['section-title']}>
                                    <span className={styles['live-indicator']}>🔴</span>
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

            {selectedMatch && (
                <ModalDialog 
                    className={styles['modal']} 
                    title={
                        <div className={styles['modal-header']}>
                            <div className={styles['modal-title-content']}>
                                <h2 className={styles['modal-title']}>{selectedMatch.title}</h2>
                                {selectedMatch.category && <div className={styles['modal-subtitle']}>{selectedMatch.category}</div>}
                            </div>
                            <Button className={styles['close-button']} onClick={handleCloseModal}>
                                ✕
                            </Button>
                        </div>
                    } 
                    onCloseRequest={handleCloseModal}
                    buttons={[]}
                    dataset={{}}
                    background={false}
                >
                    <div className={styles['modal-content']}>
                        {streamsLoading ? (
                            <div className={styles['stream-loading']}>
                                <div className={styles['loading-spinner']}></div>
                                <div>Loading streams...</div>
                            </div>
                        ) : selectedStreams && selectedStreams.length > 0 ? (
                            <div className={styles['stream-container']}>
                                {/* Source Selector */}
                                {selectedMatch.sources && selectedMatch.sources.length > 1 && (
                                    <div className={styles['source-selector']}>
                                        <h3>Select Source:</h3>
                                        <div className={styles['source-options']}>
                                            {selectedMatch.sources.map((source) => (
                                                <Button
                                                    key={source.source}
                                                    className={classnames(styles['source-option'], {
                                                        [styles['source-option-active']]: selectedSource === source.source
                                                    })}
                                                    onClick={() => handleSourceChange(source.source)}
                                                >
                                                    {source.source.toUpperCase()}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stream Selector */}
                                {selectedStreams.length > 1 && (
                                    <div className={styles['stream-selector']}>
                                        <h3>Select Stream:</h3>
                                        <div className={styles['stream-options']}>
                                            {selectedStreams.map((stream) => (
                                                <Button
                                                    key={stream.id}
                                                    className={classnames(styles['stream-option'], {
                                                        [styles['stream-option-active']]: selectedStream?.id === stream.id
                                                    })}
                                                    onClick={() => handleStreamSelect(stream)}
                                                >
                                                    Stream {stream.streamNo} - {stream.language} {stream.hd ? '(HD)' : '(SD)'}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {selectedStream && (
                                    <>
                                        {iframeLoading && (
                                            <div className={styles['iframe-loading']}>
                                                <div className={styles['loading-spinner']}></div>
                                                <div>Loading stream...</div>
                                            </div>
                                        )}
                                        <div className={styles['iframe-container']}>
                                            <iframe
                                                className={styles['iframe']}
                                                src={selectedStream.embedUrl}
                                                title={selectedMatch.title}
                                                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                                                allowFullScreen
                                                onLoad={handleIframeLoad}
                                                style={{ opacity: iframeLoading ? 0 : 1 }}
                                            />
                                        </div>
                                        <div className={styles['stream-info']}>
                                            <div className={styles['stream-meta']}>
                                                <div className={styles['stream-details']}>
                                                    <span className={styles['detail-label']}>Quality:</span>
                                                    <span className={styles['detail-value']}>{selectedStream.hd ? 'HD' : 'SD'}</span>
                                                </div>
                                                <div className={styles['stream-details']}>
                                                    <span className={styles['detail-label']}>Language:</span>
                                                    <span className={styles['detail-value']}>{selectedStream.language}</span>
                                                </div>
                                                <div className={styles['stream-details']}>
                                                    <span className={styles['detail-label']}>Source:</span>
                                                    <span className={styles['detail-value']}>{selectedStream.source}</span>
                                                </div>
                                            </div>
                                            <div className={styles['stream-actions']}>
                                                <Button className={styles['refresh-button']} onClick={() => window.location.reload()}>
                                                    🔄 Refresh Stream
                                                </Button>
                                                <Button className={styles['fullscreen-button']} onClick={() => {
                                                    const iframe = document.querySelector(`.${styles['iframe']}`) as HTMLIFrameElement;
                                                    if (iframe && iframe.requestFullscreen) {
                                                        iframe.requestFullscreen();
                                                    }
                                                }}>
                                                    ⛶ Fullscreen
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className={styles['no-stream-message']}>
                                <div className={styles['no-stream-icon']}>⏳</div>
                                <h3>No Streams Available</h3>
                                <p>No streams are currently available for this match. Please try again later.</p>
                                <div className={styles['match-details']}>
                                    <div className={styles['detail-item']}>
                                        <strong>Match:</strong>
                                        <span>{selectedMatch.title}</span>
                                    </div>
                                    {selectedMatch.category && (
                                        <div className={styles['detail-item']}>
                                            <strong>Category:</strong>
                                            <span>{selectedMatch.category}</span>
                                        </div>
                                    )}
                                    <div className={styles['detail-item']}>
                                        <strong>Time:</strong>
                                        <span>{formatTime(selectedMatch.date)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ModalDialog>
            )}
        </MainNavBars>
    );
};

export default Sports;
