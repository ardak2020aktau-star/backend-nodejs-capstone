const express = require('express');
const natural = require('natural');

const app = express();
app.use(express.json({ limit: '20kb' }));

const analyzer = new natural.SentimentAnalyzer(
  'English',
  natural.PorterStemmer,
  'afinn'
);

app.post('/sentiment', (req, res) => {
  const sentence = req.body?.sentence;

  if (typeof sentence !== 'string' ||
      !sentence.trim() || sentence.length > 5000) {
    return res.status(400).json({
      error: 'Provide a sentence of 1–5000 characters'
    });
  }

  try {
    const sentimentScore = analyzer.getSentiment(
      sentence.trim().split(/\s+/)
    );

    const sentiment = sentimentScore > 0
      ? 'positive'
      : sentimentScore < 0 ? 'negative' : 'neutral';

    res.json({ sentimentScore, sentiment });
  } catch {
    res.status(500).json({
      message: 'Error performing sentiment analysis'
    });
  }
});

if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, '0.0.0.0', () => {
    console.log('Sentiment service running on port ' + port);
  });
}

module.exports = app;
