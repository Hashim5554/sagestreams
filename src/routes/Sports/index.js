// Compatibility wrapper to ensure CommonJS export for Router
const React = require('react');
const mod = require('./Sports');

// Handle both default and named exports, ensuring we get a component
const SportsComponent = mod && (mod.default || mod);

// Create a wrapper component that renders the actual Sports component
function SportsRoute(props) {
    if (!SportsComponent) {
        console.error('Sports component not found:', mod);
        return React.createElement('div', null, 'Sports component not available');
    }
    return React.createElement(SportsComponent, props);
}

module.exports = SportsRoute;


