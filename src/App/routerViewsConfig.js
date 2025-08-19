// Copyright (C) 2017-2023 Smart code 203358507

const routes = require('stremio/routes');
const { routesRegexp } = require('stremio/common');

const SportsRoute = require('../routes/Sports');
const PopupPlayerRoute = require('../routes/Sports/PopupPlayer');

const routerViewsConfig = [
    [
        {
            ...routesRegexp.board,
            component: routes.Board
        }
    ],
    [
        {
            ...routesRegexp.intro,
            component: routes.Intro
        },
        {
            ...routesRegexp.discover,
            component: routes.Discover
        },
        {
            ...routesRegexp.library,
            component: routes.Library
        },
        {
            ...routesRegexp.continuewatching,
            component: routes.Library
        },
        {
            ...routesRegexp.search,
            component: routes.Search
        }
    ],
    [
        {
            regexp: /^\/sports$/,
            urlParamsNames: [],
            component: SportsRoute
        }
    ],
    [
        {
            regexp: /^\/popup-player$/,
            urlParamsNames: [],
            component: PopupPlayerRoute
        }
    ],
    [
        {
            ...routesRegexp.metadetails,
            component: routes.MetaDetails
        }
    ],
    [
        {
            ...routesRegexp.addons,
            component: routes.Addons
        },
        {
            ...routesRegexp.settings,
            component: routes.Settings
        }
    ],
    [
        {
            regexp: /^\/player$/,
            urlParamsNames: [],
            component: routes.Player
        },
        {
            ...routesRegexp.player,
            component: routes.Player
        }
    ]
];

module.exports = routerViewsConfig;
