// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useServices } = require('stremio/services');
const { useProfile, useModelState } = require('stremio/common');

// Define the addons to auto-install
const AUTO_INSTALL_ADDONS = [
    {
        transportUrl: 'https://torrentio.strem.fun/providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrentgalaxy,magnetdl,horriblesubs,nyaasi,tokyotosho,anidex%7Csort=qualitysize%7Cqualityfilter=unknown%7Climit=1%7Csizefilter=7GB/manifest.json',
        displayName: 'Torrentio', // Keep original name for identification
        hidden: true, // Don't show in addons page
        id: 'org.stremio.torrentio' // Keep original ID for functionality
    },
    {
        transportUrl: 'https://848b3516657c-usatv.baby-beamup.club/manifest.json',
        displayName: 'USA TV', // Keep original name for identification
        hidden: true, // Don't show in addons page
        id: 'com.usatv.addon' // Custom ID for USA TV
    },
    {
        transportUrl: 'https://addon.peario.xyz/manifest.json',
        displayName: 'Peario',
        hidden: true
        // Do not override id; use manifest.id to avoid duplicate mismatches
    }
];

const useAutoInstallAddons = () => {
    const { core } = useServices();
    const profile = useProfile();
    const [installedAddons, setInstalledAddons] = React.useState(new Set());
    const [hasInitialized, setHasInitialized] = React.useState(false);

    // Check if core is initialized and profile is available
    const isReady = React.useMemo(() => {
        return core && profile && profile.auth !== undefined;
    }, [core, profile]);

    // Observe installed addons from core so we don't try to reinstall
    const installedAddonsModel = useModelState({
        model: 'installed_addons',
        action: isReady ? {
            action: 'Load',
            args: {
                model: 'InstalledAddonsWithFilters',
                args: {
                    request: { type: null }
                }
            }
        } : { action: 'Unload' }
    });

    const installedIdsFromCore = React.useMemo(() => {
        const catalog = installedAddonsModel?.catalog || [];
        return new Set(catalog.map((a) => a?.manifest?.id).filter(Boolean));
    }, [installedAddonsModel]);

    const installedTransportUrlsFromCore = React.useMemo(() => {
        const catalog = installedAddonsModel?.catalog || [];
        return new Set(catalog.map((a) => a?.transportUrl).filter(Boolean));
    }, [installedAddonsModel]);

    // Check if addon is already installed
    const isAddonInstalled = React.useCallback((transportUrl) => {
        if (installedAddons.has(transportUrl)) return true;
        if (installedTransportUrlsFromCore.has(transportUrl)) return true;
        return false;
    }, [installedAddons, installedTransportUrlsFromCore]);

    // Install addon
    const installAddon = React.useCallback((addonConfig) => {
        if (!isReady || isAddonInstalled(addonConfig.transportUrl)) {
            return;
        }

        // If ID matches any installed addon, skip
        if (installedIdsFromCore.has(addonConfig.id)) {
            return;
        }

        console.log(`Auto-installing addon: ${addonConfig.displayName}`);
        
        // Fetch the manifest first
        fetch(addonConfig.transportUrl)
            .then(response => response.json())
            .then(manifest => {
                // Modify the manifest for custom display
                const modifiedManifest = {
                    ...manifest,
                    id: addonConfig.id || manifest.id,
                    name: addonConfig.displayName, // Use the display name for identification
                    // Add custom properties to identify this as an auto-installed addon
                    _autoInstalled: true,
                    _hidden: addonConfig.hidden,
                    _originalName: manifest.name // Keep original name for reference
                };

                // Create the addon object
                const addonToInstall = {
                    manifest: modifiedManifest,
                    transportUrl: addonConfig.transportUrl
                };

                // Install the addon (skip if transport already installed to avoid duplicate notifications)
                if (isAddonInstalled(addonConfig.transportUrl)) {
                    return;
                }

                core.transport.dispatch({
                    action: 'Ctx',
                    args: {
                        action: 'InstallAddon',
                        args: addonToInstall
                    }
                });

                // Mark as installed
                setInstalledAddons(prev => new Set([...prev, addonConfig.transportUrl]));
                
                console.log(`Successfully auto-installed: ${addonConfig.displayName}`);
            })
            .catch(error => {
                console.error(`Failed to auto-install addon ${addonConfig.transportUrl}:`, error);
            });
    }, [core, isReady, isAddonInstalled, installedIdsFromCore]);

    // Install addons when core is ready (for both logged-in and anonymous users)
    React.useEffect(() => {
        // Only proceed if core is ready and we haven't initialized yet
        if (!isReady || hasInitialized) {
            return;
        }

        console.log('Core ready, auto-installing addons for all users...');
        
        // Small delay to ensure core is fully ready
        setTimeout(() => {
            // Install all auto-install addons
            AUTO_INSTALL_ADDONS.forEach(addonConfig => {
                installAddon(addonConfig);
            });
            setHasInitialized(true);
        }, 1000);
    }, [isReady, hasInitialized, installAddon]);

    return {
        installedAddons,
        isAddonInstalled,
        installAddon,
        isReady
    };
};

module.exports = useAutoInstallAddons;
