(function () {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `fuzzymatcher` variable.
  var previousFuzzymatcher = root.fuzzymatcher;

  var exports = {};
  var lists = {};

  /**
   * Diff Match and Patch
   *
   * Copyright 2006 Google Inc.
   * http://code.google.com/p/google-diff-match-patch/
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */

  /**
   * @fileoverview Computes the difference between two texts to create a patch.
   * Applies the patch onto another text, allowing for errors.
   * @author fraser@google.com (Neil Fraser)
   */

  /**
   * Class containing the match methods.
   * @constructor
   */
  function fuzzymatch() {

    // Defaults.
    // Redefine these in your program to override the defaults.

    // At what point is no match declared (0.0 = perfection, 1.0 = very loose).
    this.Match_Threshold = 0.3;
    // How far to search for a match (0 = exact location, 1000+ = broad match).
    // A match this many characters away from the expected location will add
    // 1.0 to the score (0.0 is a perfect match).
    this.Match_Distance = 10;

    // The number of bits in an int.
    this.Match_MaxBits = 32;
  }

  //  MATCH FUNCTIONS


  /**
   * Locate the best instance of 'pattern' in 'text' near 'loc'.
   * @param {string} text The text to search.
   * @param {string} pattern The pattern to search for.
   * @param {number} loc The location to search around.
   * @return {number} Best match index or -1.
   */
  fuzzymatch.prototype.match_main = function(text, pattern, loc) {
    // Check for null inputs.
    if (text == null || pattern == null || loc == null) {
      throw new Error('Null input. (match_main)');
    }

    loc = Math.max(0, Math.min(loc, text.length));
    if (text == pattern) {
      // Shortcut (potentially not guaranteed by the algorithm)
      return 0;
    } else if (!text.length) {
      // Nothing to match.
      return -1;
    } else if (text.substring(loc, loc + pattern.length) == pattern) {
      // Perfect match at the perfect spot!  (Includes case of null pattern)
      return loc;
    } else {
      // Do a fuzzy compare.
      return this.match_bitap_(text, pattern, loc);
    }
  };


  /**
   * Locate the best instance of 'pattern' in 'text' near 'loc' using the
   * Bitap algorithm.
   * @param {string} text The text to search.
   * @param {string} pattern The pattern to search for.
   * @param {number} loc The location to search around.
   * @return {number} Best match index or -1.
   * @private
   */
  fuzzymatch.prototype.match_bitap_ = function(text, pattern, loc) {
    if (pattern.length > this.Match_MaxBits) {
      throw new Error('Pattern too long for this browser.');
    }

    // Initialise the alphabet.
    var s = this.match_alphabet_(pattern);

    var dmp = this;  // 'this' becomes 'window' in a closure.

    /**
     * Compute and return the score for a match with e errors and x location.
     * Accesses loc and pattern through being a closure.
     * @param {number} e Number of errors in match.
     * @param {number} x Location of match.
     * @return {number} Overall score for match (0.0 = good, 1.0 = bad).
     * @private
     */
    function match_bitapScore_(e, x) {
      var accuracy = e / pattern.length;
      var proximity = Math.abs(loc - x);
      if (!dmp.Match_Distance) {
        // Dodge divide by zero error.
        return proximity ? 1.0 : accuracy;
      }
      return accuracy + (proximity / dmp.Match_Distance);
    }

    // Highest score beyond which we give up.
    var score_threshold = this.Match_Threshold;
    // Is there a nearby exact match? (speedup)
    var best_loc = text.indexOf(pattern, loc);
    if (best_loc != -1) {
      score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
      // What about in the other direction? (speedup)
      best_loc = text.lastIndexOf(pattern, loc + pattern.length);
      if (best_loc != -1) {
        score_threshold =
            Math.min(match_bitapScore_(0, best_loc), score_threshold);
      }
    }

    // Initialise the bit arrays.
    var matchmask = 1 << (pattern.length - 1);
    best_loc = -1;

    var bin_min, bin_mid;
    var bin_max = pattern.length + text.length;
    var last_rd;
    for (var d = 0; d < pattern.length; d++) {
      // Scan for the best match; each iteration allows for one more error.
      // Run a binary search to determine how far from 'loc' we can stray at this
      // error level.
      bin_min = 0;
      bin_mid = bin_max;
      while (bin_min < bin_mid) {
        if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
          bin_min = bin_mid;
        } else {
          bin_max = bin_mid;
        }
        bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
      }
      // Use the result from this iteration as the maximum for the next.
      bin_max = bin_mid;
      var start = Math.max(1, loc - bin_mid + 1);
      var finish = Math.min(loc + bin_mid, text.length) + pattern.length;

      var rd = Array(finish + 2);
      rd[finish + 1] = (1 << d) - 1;
      for (var j = finish; j >= start; j--) {
        // The alphabet (s) is a sparse hash, so the following line generates
        // warnings.
        var charMatch = s[text.charAt(j - 1)];
        if (d === 0) {  // First pass: exact match.
          rd[j] = ((rd[j + 1] << 1) | 1) & charMatch;
        } else {  // Subsequent passes: fuzzy match.
          rd[j] = ((rd[j + 1] << 1) | 1) & charMatch |
                  (((last_rd[j + 1] | last_rd[j]) << 1) | 1) |
                  last_rd[j + 1];
        }
        if (rd[j] & matchmask) {
          var score = match_bitapScore_(d, j - 1);
          // This match will almost certainly be better than any existing match.
          // But check anyway.
          if (score <= score_threshold) {
            // Told you so.
            score_threshold = score;
            best_loc = j - 1;
            if (best_loc > loc) {
              // When passing loc, don't exceed our current distance from loc.
              start = Math.max(1, 2 * loc - best_loc);
            } else {
              // Already passed loc, downhill from here on in.
              break;
            }
          }
        }
      }
      // No hope for a (better) match at greater error levels.
      if (match_bitapScore_(d + 1, loc) > score_threshold) {
        break;
      }
      last_rd = rd;
    }
    return best_loc;
  };


  /**
   * Initialise the alphabet for the Bitap algorithm.
   * @param {string} pattern The text to encode.
   * @return {!Object} Hash of character locations.
   * @private
   */
  fuzzymatch.prototype.match_alphabet_ = function(pattern) {
    var s = {};
    for (var i = 0; i < pattern.length; i++) {
      s[pattern.charAt(i)] = 0;
    }
    for (var i = 0; i < pattern.length; i++) {
      s[pattern.charAt(i)] |= 1 << (pattern.length - i - 1);
    }
    return s;
  };

   /**
   * 18 May 2008
   * Levenshtein distance is a metric for measuring the amount of difference between two sequences.
   *  - http://en.wikipedia.org/wiki/Levenshtein_distance
   *
   * The code has been adapted from the WikiBooks project and is being redistributed
   * under the terms of that license.
   *  - http://en.wikibooks.org/wiki/GNU_Free_Documentation_License
   *  - http://en.wikibooks.org/wiki/Algorithm_implementation/Strings/Levenshtein_distance
   *
   * Please assume any errors found in the below code are translation errors
   * inserted by myself and not those of the original authors.
   *
   * @author Matt Chadburn <matt@commuterjoy.co.uk>
   * @source http://code.google.com/p/yeti-witch/source/browse/trunk/lib/levenshtein.js
   *
   */

  /**
   * @param str1 {String} The string to be compared with str1.
   * @param str2 {String} The string to be compared with str2.
   * @return {Integer} The minimum number of operations needed to transform one string into the other.
   */
  exports.levenshtein = levenshtein = function levenshtein(str1, str2) {
     if (!str1 || !str2){
       return false;
     }

    // Convert string to lowercase and remove any non-letters.
    str = str1.toLowerCase().replace(/[^a-z]/g, "");
    t = str2.toLowerCase().replace(/[^a-z]/g, "");

    var i;
    var j;
    var cost;
    var d = new Array();

    if ( str.length == 0 ){
      return str.length;
    }

    if ( t.length == 0 ){
      return str2.length;
    }

    for ( i = 0; i <= t.length; i++ ){
      d[ i ] = new Array();
      d[ i ][ 0 ] = i;
    }

    for ( j = 0; j <= str.length; j++ ){
      d[ 0 ][ j ] = j;
    }

    for ( i = 1; i <= t.length; i++ ) {
      for ( j = 1; j <= str.length; j++ ) {
        if ( t.toLowerCase().charAt( i - 1 ) == str.toLowerCase().charAt( j - 1 ) ) {
          cost = 0;
        }
        else {
          cost = 1;
        }
        d[ i ][ j ] = Math.min( d[ i - 1 ][ j ] + 1, d[ i ][ j - 1 ] + 1, d[ i - 1 ][ j - 1 ] + cost );
      }
    }

    return d[ t.length ][ str.length ];
  }

  //memoize.js - by @addyosmani, @philogb, @mathias
  // with a few useful tweaks from @DmitryBaranovsk
  // @source http://jsperf.com/comparison-of-memoization-implementations/9
  exports.memoize = memoize = function memoize( fn, invalidate ) {
    cache = {};
    return function () {
      var args = Array.prototype.slice.call(arguments),
      hash = "",
      i  = args.length;
      currentArg = null;
      while(i--){
        currentArg = args[i];
        hash += (currentArg === Object(currentArg)) ?
          JSON.stringify(currentArg) : currentArg;
      }
      return (hash in cache) ? cache[hash] :
        cache[hash] = fn.apply( this , args );
    };
  }

  _query = function(listName, query) {
    data = lists[listName].data;
    var l = data.length;
    var num_matchs = 0;
    var matches = [];
    for (var i = 0; i < l; i++) {
      // Matching algorithm returns the position at the start of that
      // match or -1 if there isn't a match.
      var position = matcher.match_main(data[i].name.toLowerCase(), query, 0);
      if (position !== -1) {
        num_matchs += 1;
        // Make a shallow copy of the object.
        var datum = JSON.parse(JSON.stringify(data[i]));

        // Calculate the match score.
        var distance = levenshtein(datum.name, query);
        var score = distance + position;

        // Add <strong> around letters which match the query.
        var highlighted = ""
        dnl = datum.name.length;
        ql = query.length;
        for ( var di = 0; di < dnl; di++ ) {
          var w = datum.name.charAt(di);
          for ( var qi = 0; qi < ql; qi++ ) {
            if (datum.name.charAt(di).toLowerCase() === query.charAt(qi).toLowerCase()) {
              w = "<strong>" + w + "</strong>";
              break;
            }
          };
          highlighted += w;
        };
        datum.highlighted = highlighted;
        datum.match_score = score;
        matches.push(datum);
      }
      // No need to keep searching beyond 100 results. In an
      // autocomplete widget, the results are just an aid as people
      // narrow down on a target so don't need to do an excaustive
      // search.
      if (num_matchs > 100) { break; }
    }
    matches.sort(function (a,b) { return a.match_score - b.match_score; } );
    return matches;
  }

  // Add new list of objects to be matched against.
  exports.addList = function(listName, data) {
    // If the list already exists, delete it.
    if (lists[listName]) { delete lists[listName]; }

    // You can't create a list named "all" as it's a special meta-list.
    if (listName === "all") { return false; }

    // Add new list.
    lists[listName] = {
      name: listName,
      memoized: memoize(_query),
      data: data
    };

    return true;
  }

  // Return an array of matches for the query.
  exports.query = function (listNames, query) {
    // No query, no matches.
    if (!query) { return false; }

    // If the listNames is "all", query all lists.
    if (listNames === "all") {
      var keys = [];
      for (var key in lists) if (hasOwnProperty.call(lists, key)) keys[keys.length] = key;
      listNames = keys;
    }

    // Make listNames an array if just a string is passed in.
    if (typeof listNames === "string") { listNames = [listNames]; }

    // Check that the lists exist.
    var l = listNames.length;
    for (var i = 0; i < l; i++) {
      if (typeof lists[listNames[i]] === 'undefined') return false;
    }

    // Iterate over each list and concatenate the match arrays.
    matches = [];
    for (var i = 0; i < l; i++) {
      matches = matches.concat(lists[listNames[i]].memoized(listNames[i], query));
    }

    // Sort the merged resultset.
    if (listNames.length > 1) {
      matches.sort(function (a,b) { return a.match_score - b.match_score; } );
    }

    return matches;
  }

  // Provide helper for the most common scenario where you want to insert a list of 
  // <li>s with results into a ordered or unordered list.
  //
  // @return documentFragment which can be inserted directly into the
  // page.
  exports.htmlQuery = function(listName, query, count) {
    if (typeof lists[listName] === 'undefined') return false;

    var matches = exports.query(listName, query);

    var str = "";
    if (matches.length > 0) {
      matches = matches.slice(0, count);
      if (matches.length < count) { count = matches.length; }
      for (var i = 0; i < count; i++) {
        str += '<li>' + matches[i].highlighted + '</li>';
      }
      var div = document.createElement("div");
      div.innerHTML = str;
      var fragment = document.createDocumentFragment();
      while ( div.firstChild ) {
        fragment.appendChild( div.firstChild );
      }
      return fragment;
    }
  }

  matcher = new fuzzymatch();

  window.fuzzymatcher = exports;

})();
