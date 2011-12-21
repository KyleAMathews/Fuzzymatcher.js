A fuzzymatching library!

It was written to power auto-completion widgets for backbone.js models
but I'm sure you can find other creative uses for it.

### Features

* Small (1.5 KB minified and gzipped) library for fuzzymatching strings.
* Performant at least to ~10,000 items.
* Match results are memoized.
* Search against one or multiple or all lists.
* Perfect for creating autocomplete widgets

Note, Fuzzymatcher.js requires JSON.stringify and JSON.parse. If you're
supporting IE6 and IE7 you'll need to provide these functions.

### How to use

#### Simple example.

    // Initialize a new fuzzymatcher list.
    // words is an Array of javascript objects. For now, fuzzymatcher.js
    // matches against a "name" property on each object. In the future,
    // you'll be able to designate which property to match against.
    fuzzymatcher.addList('words', words);

    // Query list.
    matches = fuzzymatcher.query('words', 'query');

#### More complex example.

    // Initialize two lists.
    fuzzymatcher.addList('followers', followers);
    fuzzymatcher.addList('following', 'following');

    // Query just the followers list.
    matches = fuzzymatcher.query('followers', 'John');

    // Query both lists.
    matches = fuzzymatcher.query(['followers', 'following'], 'John');

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

### TODOs

* Write tests

* Warm up cache on popular queries on page load. i.e. keep track of each query where something is selected and for the top few of these, run that query so results already stored. Don't turn on by default as it could seriously slow down site if you do too many. Do a setTimeout thing so only do one query every .1 seconds as that shouldn't affect the responsiveness of the UI too much.

* Add training api, simple count. if someone clicks you say match.train('project', 'id', 'query') Next search, at each query, if there's an item that's been selected before boost it's score. Subtract 2 * number of times selected from its score divided by the levenstein distance from past queries where it was selected to the current query. So for example, if it was selected before for "port" and the current query is po, subtract 1 from its score (2/2). Next time, at "po" you'd subtract 3 from its score ((2 * 1) + (2 * 1) / 2). The time after that at "po" you'd subtract 5 from its score ((2 * 2) + (2 * 1) / 2). Might have to do a max subtraction, otherwise some popular items would always show up first even if query is very different. Store this training data in localstorage if possible. Otherwise, just keep it in memory. Also let people pass in training data associated with a item. This would be especially good for mobile browsers as they're underpowered. You could precomputer results on the server and pass those in.

* Make library work with Node.js.

* Allow people to override settings.
