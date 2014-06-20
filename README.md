A fuzzymatching library!

Useful for:

* Autocomplete textfields
* In-browser search
* Filtering table rows or lists

### Features

* Small (1.5 KB minified and gzipped) library for fuzzymatching strings.
* Performant at least to ~10,000 items.
* Match results are memoized.
* Search against one or multiple or all lists.

Note, Fuzzymatcher.js requires JSON.stringify and JSON.parse. If you're
supporting IE6 and IE7 you'll need to provide these functions.

### How to use

#### Simple example.

````javascript
// Initialize a new fuzzymatcher list.
// words is an Array of javascript objects. For now, fuzzymatcher.js
// matches against a "name" property on each object. In the future,
// you'll be able to designate which property to match against.
fuzzymatcher.addList('words', words);

// Query list.
matches = fuzzymatcher.query('words', 'query');
````

#### More complex example.

````javascript
// Initialize two lists.
fuzzymatcher.addList('followers', followers);
fuzzymatcher.addList('following', 'following');

// Query just the followers list.
matches = fuzzymatcher.query('followers', 'John');

// Query both lists.
matches = fuzzymatcher.query(['followers', 'following'], 'John');
````

Each returned match object is a copy of the original object. In addition
there's the following properties added.

**match_score** The internal score for the object. Calculated by adding
the levenshtein distance and match position (i.e. how far from the start
of the string was the match. We're assuming the match should start at
the beginning of word. This assumption might not be true for
non-auto-complete application). The matches array which is returned is
already sorted by the match_score.

**highlighted** The name property "highlighted" with ```<strong>``` tags on
each letter which matches a letter in the query.

