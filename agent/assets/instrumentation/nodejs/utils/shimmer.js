/**
 * Lightweight Shim/Wrap utility (replacing 'shimmer' dependency)
 */

function isFunction(obj) {
    return typeof obj === 'function';
}

function wrap(nodule, name, wrapper) {
    if (!nodule || !nodule[name]) {
        console.warn(`[APM] Shim: Method ${name} not found on module`);
        return;
    }

    if (!wrapper) {
        console.warn(`[APM] Shim: Wrapper function is missing for ${name}`);
        return;
    }

    const original = nodule[name];
    const wrapped = wrapper(original);

    wrapped.__original = original;
    wrapped.__unwrap = function () {
        if (nodule[name] === wrapped) {
            nodule[name] = original;
        }
    };

    nodule[name] = wrapped;
}

function unwrap(nodule, name) {
    if (!nodule || !nodule[name] || !nodule[name].__unwrap) {
        return;
    }
    nodule[name].__unwrap();
}

module.exports = {
    wrap,
    unwrap
};
