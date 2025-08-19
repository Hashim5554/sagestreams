// Copyright (C) 2017-2023 Smart code 203358507

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { MainNavBars, Button, ModalDialog, Image } from 'stremio/components';
import styles from './Sports.less';

type PpvStream = {
    id: number;
    name: string;
    tag?: string;
    poster?: string;
    uri_name: string;
    starts_at?: number;
    ends_at?: number;
    always_live?: number;
    category_name?: string;
    iframe?: string;
    allowpaststreams?: number;
};

type PpvCategory = {
    category: string;
    id: number;
    always_live?: number;
    streams: PpvStream[];
};

type PpvResponse = {
    success: boolean;
    timestamp: number;
    performance?: number;
    streams: PpvCategory[];
};

const API_BASE = 'https://ppv.to';
const CACHE_TTL_MS = 60_000;

const storageKey = 'ppvto_streams_cache_v1';

function readCache(): { at: number; data: PpvResponse } | null {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeCache(data: PpvResponse): void {
    try {
        localStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), data }));
    } catch {}
}

async function fetchStreams(force = false): Promise<PpvResponse | null> {
    const cached = readCache();
    if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.data;
    }
    try {
        const res = await fetch(`${API_BASE}/api/streams`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PpvResponse;
        if (json && json.success) {
            writeCache(json);
            return json;
        }
        return json;
    } catch (e) {
        // fallback to stale cache
        return cached?.data ?? null;
    }
}

function formatTime(ts?: number): string {
    if (!ts) return '';
    try {
        const d = new Date(ts * 1000);
        return d.toLocaleString();
    } catch {
        return '';
    }
}

function isLive(now: number, s: PpvStream): boolean {
    if (s.always_live === 1) return true;
    if (s.starts_at && s.ends_at) {
        const startMs = s.starts_at * 1000;
        const endMs = s.ends_at * 1000;
        return now >= startMs && now <= endMs;
    }
    return false;
}

function isAlwaysLive(s: PpvStream): boolean {
    return s.always_live === 1;
}

function getTimeRemaining(now: number, s: PpvStream): string {
    if (s.always_live === 1) return '24/7';
    if (s.ends_at) {
        const endMs = s.ends_at * 1000;
        const remaining = endMs - now;
        if (remaining <= 0) return 'Ended';
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m left`;
        } else {
            return `${minutes}m left`;
        }
    }
    return '';
}

const Sports: React.FC = () => {
    const [data, setData] = useState<PpvResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<PpvStream | null>(null);
    const [iframeLoading, setIframeLoading] = useState<boolean>(false);
    const intervalRef = useRef<number | null>(null);

    const load = useCallback(async (force = false) => {
        setError(null);
        const res = await fetchStreams(force);
        if (res === null) {
            setError('Failed to load streams');
        }
        setData(res);
        setLoading(false);
    }, []);

    useEffect(() => {
        load(false);
        intervalRef.current = window.setInterval(() => load(false), 60_000);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
        };
    }, [load]);

    const now = Date.now();
    const categories = useMemo(() => data?.streams ?? [], [data]);

    const liveCategories = useMemo(() => {
        return categories
            .map((c) => ({
                ...c,
                streams: c.streams.filter((s) => isLive(now, s) && !isAlwaysLive(s))
            }))
            .filter((c) => c.streams.length > 0);
    }, [categories, now]);

    const alwaysLiveCategories = useMemo(() => {
        return categories
            .map((c) => ({
                ...c,
                streams: c.streams.filter((s) => isAlwaysLive(s))
            }))
            .filter((c) => c.streams.length > 0);
    }, [categories]);

    const upcomingCategories = useMemo(() => {
        return categories
            .map((c) => ({
                ...c,
                streams: c.streams.filter((s) => !isLive(now, s) && !isAlwaysLive(s) && (s.starts_at ? s.starts_at * 1000 > now : false))
            }))
            .filter((c) => c.streams.length > 0);
    }, [categories, now]);

    const handleWatchClick = (stream: PpvStream) => {
        // Prefer popup player (same-origin page with embedded iframe) to avoid CORS and block popups/ads
        if (stream.iframe) {
            const encoded = encodeURIComponent(stream.iframe);
            const title = encodeURIComponent(stream.name || 'Live Stream');
            window.location.hash = `/popup-player?source=${encoded}&title=${title}`;
            return;
        }
        // Fallback to modal if no URL available yet
        setSelected(stream);
        setIframeLoading(!!stream.iframe);
    };

    const handleIframeLoad = () => {
        setIframeLoading(false);
    };

    const handleCloseModal = () => {
        setSelected(null);
        setIframeLoading(false);
    };

    return (
        <MainNavBars className={styles['sports-container']} route={'sports'} title={'sagestreams'}>
            <div className={classnames(styles['sports-content'], 'animation-fade-in')}>
                {loading ? (
                    <div className={styles['message']}>
                        <div className={styles['loading-spinner']}></div>
                        <div>Loading live sports…</div>
                    </div>
                ) : error ? (
                    <div className={styles['message']}>
                        <div className={styles['error-icon']}>⚠️</div>
                        <div>{error}</div>
                    </div>
                ) : !data || categories.length === 0 ? (
                    <div className={styles['message']}>
                        <div className={styles['empty-icon']}>🏟️</div>
                        <div>No streams available right now.</div>
                    </div>
                ) : (
                    <>
                        {liveCategories.length > 0 && (
                            <section className={styles['section']}>
                                <h2 className={styles['section-title']}>Live Now</h2>
                                {liveCategories.map((cat) => (
                                    <div key={cat.id} className={styles['category']}>
                                        <div className={styles['category-header']}>
                                            <h3 className={styles['category-title']}>{cat.category}</h3>
                                            <div className={styles['live-indicator']}>
                                                <div className={styles['live-dot']}></div>
                                                LIVE
                                            </div>
                                        </div>
                                        <div className={styles['grid']}>
                                            {cat.streams.map((s) => (
                                                <div key={s.id} className={styles['card']}>
                                                    <div className={styles['poster']}> 
                                                        {s.poster ? (
                                                            <img 
                                                                className={styles['poster-img']} 
                                                                src={s.poster} 
                                                                alt={s.name}
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
                                                        <div className={styles['badge-live']}>LIVE</div>
                                                        <div className={styles['time-remaining']}>{getTimeRemaining(now, s)}</div>
                                                    </div>
                                                    <div className={styles['card-body']}>
                                                        <div className={styles['card-title']}>{s.name}</div>
                                                        {s.tag ? <div className={styles['card-subtitle']}>{s.tag}</div> : null}
                                                        <div className={styles['time']}>{formatTime(s.starts_at)}{s.ends_at ? ` — ${formatTime(s.ends_at)}` : ''}</div>
                                                        <Button className={styles['watch-button']} onClick={() => handleWatchClick(s)}>
                                                            <span className={styles['watch-icon']}>▶️</span>
                                                            Watch Live
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}

                        {upcomingCategories.length > 0 && (
                            <section className={styles['section']}>
                                <h2 className={styles['section-title']}>Upcoming</h2>
                                {upcomingCategories.map((cat) => (
                                    <div key={cat.id} className={styles['category']}>
                                        <div className={styles['category-header']}>
                                            <h3 className={styles['category-title']}>{cat.category}</h3>
                                            <div className={styles['upcoming-indicator']}>
                                                <div className={styles['upcoming-dot']}></div>
                                                SOON
                                            </div>
                                        </div>
                                        <div className={styles['grid']}>
                                            {cat.streams.map((s) => (
                                                <div key={s.id} className={styles['card']}>
                                                    <div className={styles['poster']}>
                                                        {s.poster ? (
                                                            <img 
                                                                className={styles['poster-img']} 
                                                                src={s.poster} 
                                                                alt={s.name}
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
                                                        <div className={styles['badge-upcoming']}>SOON</div>
                                                    </div>
                                                    <div className={styles['card-body']}>
                                                        <div className={styles['card-title']}>{s.name}</div>
                                                        {s.tag ? <div className={styles['card-subtitle']}>{s.tag}</div> : null}
                                                        <div className={styles['time']}>{formatTime(s.starts_at)}{s.ends_at ? ` — ${formatTime(s.ends_at)}` : ''}</div>
                                                        <Button className={styles['watch-button']} disabled={!s.iframe} onClick={() => handleWatchClick(s)}>
                                                            {s.iframe ? (
                                                                <>
                                                                    <span className={styles['watch-icon']}>▶️</span>
                                                                    Watch
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className={styles['clock-icon']}>⏰</span>
                                                                    Not yet available
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}

                        {alwaysLiveCategories.length > 0 && (
                            <section className={styles['section']}>
                                <h2 className={styles['section-title']}>24/7 Streams</h2>
                                {alwaysLiveCategories.map((cat) => (
                                    <div key={cat.id} className={styles['category']}>
                                        <div className={styles['category-header']}>
                                            <h3 className={styles['category-title']}>{cat.category}</h3>
                                            <div className={styles['always-live-indicator']}>
                                                <div className={styles['always-live-dot']}></div>
                                                24/7
                                            </div>
                                        </div>
                                        <div className={styles['grid']}>
                                            {cat.streams.map((s) => (
                                                <div key={s.id} className={styles['card']}>
                                                    <div className={styles['poster']}>
                                                        {s.poster ? (
                                                            <img 
                                                                className={styles['poster-img']} 
                                                                src={s.poster} 
                                                                alt={s.name}
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
                                                        <div className={styles['badge-always-live']}>24/7</div>
                                                    </div>
                                                    <div className={styles['card-body']}>
                                                        <div className={styles['card-title']}>{s.name}</div>
                                                        {s.tag ? <div className={styles['card-subtitle']}>{s.tag}</div> : null}
                                                        <div className={styles['time']}>Always Available</div>
                                                        <Button className={styles['watch-button']} onClick={() => handleWatchClick(s)}>
                                                            <span className={styles['watch-icon']}>▶️</span>
                                                            Watch Now
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}
                    </>
                )}
            </div>

            {selected && (
                <ModalDialog 
                    className={styles['modal']} 
                    title={
                        <div className={styles['modal-header']}>
                            <div className={styles['modal-title-content']}>
                                <h2 className={styles['modal-title']}>{selected.name}</h2>
                                {selected.tag && <div className={styles['modal-subtitle']}>{selected.tag}</div>}
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
                        {selected.iframe ? (
                            <div className={styles['stream-container']}>
                                {iframeLoading && (
                                    <div className={styles['iframe-loading']}>
                                        <div className={styles['loading-spinner']}></div>
                                        <div>Loading stream...</div>
                                    </div>
                                )}
                                <div className={styles['iframe-container']}>
                                    <iframe
                                        className={styles['iframe']}
                                        src={selected.iframe}
                                        title={selected.name}
                                        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                                        allowFullScreen
                                        onLoad={handleIframeLoad}
                                        style={{ opacity: iframeLoading ? 0 : 1 }}
                                    />
                                </div>
                                <div className={styles['stream-info']}>
                                    <div className={styles['stream-meta']}>
                                        {selected.category_name && (
                                            <div className={styles['stream-category']}>
                                                <span className={styles['category-icon']}>🏆</span>
                                                {selected.category_name}
                                            </div>
                                        )}
                                        {selected.starts_at && (
                                            <div className={styles['stream-time']}>
                                                <span className={styles['time-icon']}>🕐</span>
                                                {formatTime(selected.starts_at)}
                                                {selected.ends_at && ` — ${formatTime(selected.ends_at)}`}
                                            </div>
                                        )}
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
                            </div>
                        ) : (
                            <div className={styles['no-stream-message']}>
                                <div className={styles['no-stream-icon']}>⏳</div>
                                <h3>Stream Not Yet Available</h3>
                                <p>This stream will be available when the event starts. Check back later for live coverage.</p>
                                <div className={styles['stream-details']}>
                                    <div className={styles['detail-item']}>
                                        <strong>Event:</strong>
                                        <span>{selected.name}</span>
                                    </div>
                                    {selected.category_name && (
                                        <div className={styles['detail-item']}>
                                            <strong>Category:</strong>
                                            <span>{selected.category_name}</span>
                                        </div>
                                    )}
                                    {selected.starts_at && (
                                        <div className={styles['detail-item']}>
                                            <strong>Start Time:</strong>
                                            <span>{formatTime(selected.starts_at)}</span>
                                        </div>
                                    )}
                                    {selected.ends_at && (
                                        <div className={styles['detail-item']}>
                                            <strong>End Time:</strong>
                                            <span>{formatTime(selected.ends_at)}</span>
                                        </div>
                                    )}
                                    {selected.tag && (
                                        <div className={styles['detail-item']}>
                                            <strong>Details:</strong>
                                            <span>{selected.tag}</span>
                                        </div>
                                    )}
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
