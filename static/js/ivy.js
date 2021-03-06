var IVY = (function(){

    var MOCK = false;
    
    // What fraction of the max word score do we get for a word if it the voice 
    // recognition has only provisionally detected the word? 
    var PROVISIONAL_MATCH_RATIO = 0.9;
    
    var my = {};
    
    function wordify(sentence) {
        return _.chain(sentence.split(/[\s,.\?\!]+/))
            .map(function(word) { return word.toLowerCase(); })
            .filter(function(word) { return word.length; })
            .value();
    }
    
    my.Exchange = function(json, onwinner) {
        this.cursor = json.cursor;
        this.agentSpeech = json.out;
        this.userOptions = _.map(json.in, function(str){ return new my.Option(str); });
        this.finalSpeech = "";
        this.provisionalSpeech = "";
        this.winner = null;
        this.onwinner = onwinner;
        
        this.updateWithTranscripts = function(final, provisional) {
            this.provisionalSpeech = provisional;
            this.finalSpeech = final;
            var finalWords = _.uniq(wordify(final));
            var provisionalWords = _.uniq(wordify(provisional));
            _.invoke(this.userOptions, 'updateScore', finalWords, provisionalWords);
            if (!this.winner) {
                this.checkForWinner();
            }
        }.bind(this);
        
        this.checkForWinner = function() {
            if (this.winner) {
                console.log("checkForWinner called even though a winner has " + 
                    "already been chosen.");
                return;
            }
            this.winner = _.find(this.userOptions, function(option) {
                return option.isEligibleToWin();
            });
            if (this.winner) {
                this.onwinner(this.winner);
            }
        }.bind(this);
        
        if (MOCK) {
            this.updateWithTranscripts("Tell", "me about yourself");
        }

    };

    my.Option = function(sentence) {
        this.sentence = sentence;
        this.words = wordify(sentence);
        this.score = 0;
        this.maxScorePerWord = 1.0/this.words.length;
        
        // The score required for the sentence to become eligible to win.
        // At the moment, we require all but the last two words to at least have
        // been provisionally detected, or 50% detection, whichever is greater.
        this.scoreThreshold = Math.max(
            this.maxScorePerWord * (this.words.length - 2) * PROVISIONAL_MATCH_RATIO,
            0.5
        );
        
        this.updateScore = function(finalWords, provisionalWords) {
            var totalScore = 0.0;
            
            _.each(this.words, function(word) {
                if (_.contains(finalWords, word)) {
                    totalScore += this.maxScorePerWord;
                } else if (_.contains(provisionalWords, word)) {
                    totalScore += this.maxScorePerWord * PROVISIONAL_MATCH_RATIO;
                }
            }, this);

            this.score = totalScore;
        }.bind(this);
        
        this.getScorePercent = function() {
            return (this.score * 100).toFixed(0) + "%";
        }.bind(this);
        
        this.isEligibleToWin = function() {
            return this.score > this.scoreThreshold;
        }.bind(this);
        
    };

    return my;
}());

