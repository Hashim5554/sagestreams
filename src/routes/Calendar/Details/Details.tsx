// Copyright (C) 2017-2024 Smart code 203358507

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@stremio/stremio-icons/react';
import { Button } from 'stremio/components';
import styles from './Details.less';
import { motion } from 'framer-motion';

type Props = {
    selected: CalendarDate | null,
    items: CalendarItem[],
};

const Details = ({ selected, items }: Props) => {
    const { t } = useTranslation();
    const videos = useMemo(() => {
        return items.find(({ date }) => date.day === selected?.day)?.items ?? [];
    }, [selected, items]);

    const getSelectedDate = () => {
        const year = (selected as any)?.year ?? new Date().getFullYear();
        const month = (selected as any)?.month ?? (new Date().getMonth() + 1);
        const day = selected?.day ?? new Date().getDate();
        // default at 18:00 local time
        return new Date(year, month - 1, day, 18, 0, 0);
    };

    const formatGoogleDateRange = (start: Date, durationMinutes = 60) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const toBasic = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
        const end = new Date(start.getTime() + durationMinutes * 60000);
        return `${toBasic(start)}/${toBasic(end)}`;
    };

    const createIcsAndDownload = (summary: string, description: string) => {
        const start = getSelectedDate();
        const dt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
        const end = new Date(start.getTime() + 60 * 60000);
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//sagestreams//Calendar Export//EN',
            'BEGIN:VEVENT',
            `DTSTAMP:${dt(new Date())}`,
            `DTSTART:${dt(start)}`,
            `DTEND:${dt(end)}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${summary.replace(/\s+/g, '_')}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const openGoogleCalendar = (summary: string, details: string) => {
        const start = getSelectedDate();
        const dates = formatGoogleDateRange(start, 60);
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(summary)}&details=${encodeURIComponent(details)}&dates=${dates}`;
        window.open(url, '_blank');
    };

    return (
        <div className={styles['details']}>
            {
                videos.map(({ id, name, season, episode, deepLinks }) => (
                    <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        <Button className={styles['video']} href={deepLinks.metaDetailsStreams}>
                            <div className={styles['actions']}>
                                <Button
                                    className={styles['calendar-btn']}
                                    tabIndex={-1}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); createIcsAndDownload(`${name} S${season}E${episode}`, deepLinks?.metaDetailsStreams || ''); }}
                                >
                                    <Icon className={styles['calendar-icon']} name={'calendar'} />
                                </Button>
                                <Button
                                    className={styles['calendar-btn']}
                                    tabIndex={-1}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openGoogleCalendar(`${name} S${season}E${episode}`, deepLinks?.metaDetailsStreams || ''); }}
                                >
                                    <Icon className={styles['calendar-icon']} name={'open'} />
                                </Button>
                            </div>
                            <div className={styles['name']}>
                                {name}
                            </div>
                            <div className={styles['info']}>
                                S{season}E{episode}
                            </div>
                            <Icon className={styles['icon']} name={'play'} />
                        </Button>
                    </motion.div>
                ))
            }
            {
                !videos.length ?
                    <div className={styles['placeholder']}>
                        {t('CALENDAR_NO_NEW_EPISODES')}
                    </div>
                    :
                    null
            }
        </div>
    );
};

export default Details;
