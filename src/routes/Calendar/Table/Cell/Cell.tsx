// Copyright (C) 2017-2024 Smart code 203358507

import React, { useCallback, useMemo, MouseEvent, useState } from 'react';
import Icon from '@stremio/stremio-icons/react';
import classNames from 'classnames';
import { Button, HorizontalScroll, Image } from 'stremio/components';
import styles from './Cell.less';
import { motion } from 'framer-motion';

type Props = {
    selected: CalendarDate | null,
    monthInfo: CalendarMonthInfo,
    date: CalendarDate,
    items: CalendarContentItem[],
    onClick: (date: CalendarDate) => void,
};

const Cell = ({ selected, monthInfo, date, items, onClick }: Props) => {
    const [active, today] = useMemo(() => [
        date.day === selected?.day,
        date.day === monthInfo.today,
    ], [selected, monthInfo, date]);

    const onCellClick = () => {
        onClick && onClick(date);
    };

    const onPosterClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);

    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const resetTilt = () => setTilt({ x: 0, y: 0 });
    const onMouseMoveTilt = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 6; // tilt left/right
        const rotateX = (0.5 - py) * 6; // tilt up/down
        setTilt({ x: rotateX, y: rotateY });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.995 }}
            transition={{ duration: 0.25 }}
            style={{ transformStyle: 'preserve-3d', perspective: 800, rotateX: tilt.x, rotateY: tilt.y }}
            onMouseMove={onMouseMoveTilt}
            onMouseLeave={resetTilt}
            onClick={onCellClick}
            role={'button'}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onCellClick(); } }}
        >
        <Button
            className={classNames(styles['cell'], { [styles['active']]: active, [styles['today']]: today })}
            onClick={onCellClick}
        >
            <div className={styles['heading']}>
                <div className={styles['day']}>
                    {date.day}
                </div>
            </div>
            <HorizontalScroll className={styles['items']}>
                {
                    items.map(({ id, name, poster, deepLinks }) => (
                        <motion.div key={id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
                            <Button className={styles['item']} href={deepLinks.metaDetailsStreams} tabIndex={-1} onClick={onPosterClick}>
                                <Icon className={styles['icon']} name={'play'} />
                                <Image
                                    className={styles['poster']}
                                    src={poster}
                                    alt={name}
                                />
                            </Button>
                        </motion.div>
                    ))
                }
            </HorizontalScroll>
            {
                items.length > 0 ?
                    <Icon className={styles['more']} name={'more-horizontal'} />
                    :
                    null
            }
        </Button>
        </motion.div>
    );
};

export default Cell;
