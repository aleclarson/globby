
var objectAssign = require('object-assign');
var arrayUnion = require('array-union');
var Promise = require('Promise');
var arrify = require('arrify');

var glob = require('glob');
var globSync = glob.sync;
var globAsync = Promise.ify(glob);

function sortPatterns(patterns) {
	patterns = arrify(patterns);

	var positives = [];
	var negatives = [];

	patterns.forEach(function (pattern, index) {
		var isNegative = pattern[0] === '!';
		(isNegative ? negatives : positives).push({
			index: index,
			pattern: isNegative ? pattern.slice(1) : pattern
		});
	});

	return {
		positives: positives,
		negatives: negatives
	};
}

function setIgnore(opts, negatives, positiveIndex) {
	opts = objectAssign({}, opts);

	var negativePatterns = negatives.filter(function (negative) {
		return negative.index > positiveIndex;
	}).map(function (negative) {
		return negative.pattern;
	});

	opts.ignore = (opts.ignore || []).concat(negativePatterns);
	return opts;
}

module.exports = function (patterns, opts) {
	var sortedPatterns = sortPatterns(patterns);
	opts = opts || {};

	if (sortedPatterns.positives.length === 0) {
		return Promise.resolve([]);
	}

	return Promise.all(sortedPatterns.positives.map(function (positive) {
		var globOpts = setIgnore(opts, sortedPatterns.negatives, positive.index);
		return globAsync(positive.pattern, globOpts);
	})).then(function (paths) {
		return arrayUnion.apply(null, paths);
	});
};

module.exports.sync = function (patterns, opts) {
	var sortedPatterns = sortPatterns(patterns);

	if (sortedPatterns.positives.length === 0) {
		return [];
	}

	return sortedPatterns.positives.reduce(function (ret, positive) {
		return arrayUnion(ret, globSync(positive.pattern, setIgnore(opts, sortedPatterns.negatives, positive.index)));
	}, []);
};
