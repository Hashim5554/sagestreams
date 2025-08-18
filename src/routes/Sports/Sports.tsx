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

const Sports: React.FC = () => {
    const [data, setData] = useState<PpvResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<PpvStream | null>(null);
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
                streams: c.streams.filter((s) => isLive(now, s))
            }))
            .filter((c) => c.streams.length > 0);
    }, [categories, now]);

    const upcomingCategories = useMemo(() => {
        return categories
            .map((c) => ({
                ...c,
                streams: c.streams.filter((s) => !isLive(now, s) && (s.starts_at ? s.starts_at * 1000 > now : false))
            }))
            .filter((c) => c.streams.length > 0);
    }, [categories, now]);

    return (
        <MainNavBars className={styles['sports-container']} route={'sports'} title={'SageStreams'}>
            <div className={classnames(styles['sports-content'], 'animation-fade-in')}>
                {loading ? (
                    <div className={styles['message']}>Loading live sports…</div>
                ) : error ? (
                    <div className={styles['message']}>{error}</div>
                ) : !data || categories.length === 0 ? (
                    <div className={styles['message']}>No streams available right now.</div>
                ) : (
                    <>
                        {liveCategories.length > 0 && (
                            <section className={styles['section']}>
                                <h2 className={styles['section-title']}>Live Now</h2>
                                {liveCategories.map((cat) => (
                                    <div key={cat.id} className={styles['category']}>
                                        <div className={styles['category-header']}>
                                            <h3 className={styles['category-title']}>{cat.category}</h3>
                                        </div>
                                        <div className={styles['grid']}>
                                            {cat.streams.map((s) => (
                                                <div key={s.id} className={styles['card']}>
                                                    <div className={styles['poster']}> 
                                                        {s.poster ? (
                                                            <Image className={styles['poster-img']} src={s.poster} alt={' '} />
                                                        ) : (
                                                            <div className={styles['poster-fallback']} />
                                                        )}
                                                        <div className={styles['badge-live']}>LIVE</div>
                                                    </div>
                                                    <div className={styles['card-body']}>
                                                        <div className={styles['card-title']}>{s.name}</div>
                                                        {s.tag ? <div className={styles['card-subtitle']}>{s.tag}</div> : null}
                                                        <div className={styles['time']}>{formatTime(s.starts_at)}{s.ends_at ? ` — ${formatTime(s.ends_at)}` : ''}</div>
                                                        <Button className={styles['watch-button']} onClick={() => setSelected(s)}>
                                                            Watch
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
                                        </div>
                                        <div className={styles['grid']}>
                                            {cat.streams.map((s) => (
                                                <div key={s.id} className={styles['card']}>
                                                    <div className={styles['poster']}>
                                                        {s.poster ? (
                                                            <Image className={styles['poster-img']} src={s.poster} alt={' '} />
                                                        ) : (
                                                            <div className={styles['poster-fallback']} />
                                                        )}
                                                        <div className={styles['badge-upcoming']}>SOON</div>
                                                    </div>
                                                    <div className={styles['card-body']}>
                                                        <div className={styles['card-title']}>{s.name}</div>
                                                        {s.tag ? <div className={styles['card-subtitle']}>{s.tag}</div> : null}
                                                        <div className={styles['time']}>{formatTime(s.starts_at)}{s.ends_at ? ` — ${formatTime(s.ends_at)}` : ''}</div>
                                                        <Button className={styles['watch-button']} disabled={!s.iframe} onClick={() => setSelected(s)}>
                                                            {s.iframe ? 'Watch' : 'Not yet available'}
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
                <ModalDialog className={styles['modal']} title={selected.name} onCloseRequest={() => setSelected(null)}>
                    {selected.iframe ? (
                        <div className={styles['iframe-container']}>
                            <iframe
                                className={styles['iframe']}
                                src={selected.iframe}
                                title={selected.name}
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-popups"
                            />
                        </div>
                    ) : (
                        <div className={styles['message']}>This stream is not yet available.</div>
                    )}
                </ModalDialog>
            )}
        </MainNavBars>
    );
};

export default Sports;
