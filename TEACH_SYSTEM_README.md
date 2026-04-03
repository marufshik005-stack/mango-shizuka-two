# 🧠 AI Teach System for GoatBot V2

## 📋 Overview

The AI Teach System is a comprehensive learning system that allows your bot to learn from user interactions and automatically respond to messages based on taught patterns. It features intelligent response matching, anti-duplication mechanisms, and MongoDB storage for persistent learning.

## ✨ Features

### 🎯 Core Features
- **Smart Learning**: Teach the bot questions and answers
- **Intelligent Matching**: Multiple matching algorithms for best responses
- **Anti-Duplication**: Prevents bot from replying to the same message multiple times
- **Random Selection**: When multiple responses exist, picks one randomly
- **Closest Match**: Falls back to most similar response when no exact match found
- **MongoDB Storage**: Persistent data storage with indexing for fast queries

### 🔧 Advanced Features
- **Usage Statistics**: Tracks how often responses are used
- **Response Management**: Add, remove, list, and search responses
- **Thread-based Learning**: Each chat thread has its own knowledge base
- **Fuzzy Matching**: Uses string similarity algorithms
- **Message Tracking**: Remembers which messages it has responded to

## 🚀 Installation

1. **Files Created:**
   - `database/models/teachModel.js` - MongoDB schema
   - `scripts/cmds/teach.js` - Main command file
   - `scripts/events/teachResponse.js` - Event handler
   - `test-teach.js` - Test script

2. **Dependencies:** 
   - Already included: `string-similarity`, `mongoose`

3. **Test the System:**
   ```bash
   node test-teach.js
   ```

## 📖 Usage Guide

### 🎓 Teaching the Bot

#### Add New Response
```
.teach <question> | <answer>
```
**Examples:**
- `.teach hello | Hi there! How can I help you?`
- `.teach what's your name | I'm Shizuka Bot!`
- `.teach how are you | I'm doing great, thanks for asking!`

#### Remove Response
```
.teach remove <question>
```
**Example:**
- `.teach remove hello`

#### List All Responses
```
.teach list [page_number]
```
**Examples:**
- `.teach list` - Shows page 1
- `.teach list 2` - Shows page 2

#### Search Responses
```
.teach search <keyword>
```
**Example:**
- `.teach search greeting`

#### View Statistics
```
.teach stats
```

### 🤖 Automatic Responses

The bot will automatically respond to messages based on learned patterns:

1. **Exact Match**: Looks for exact question match first
2. **Partial Match**: Searches for partial matches in questions
3. **Reverse Match**: Checks if user message contains the question
4. **Similarity Match**: Uses string similarity (30% threshold minimum)
5. **Random Selection**: If multiple responses available, picks randomly

## 🔧 Technical Details

### 📊 Database Schema

```javascript
{
  question: String,        // The trigger phrase (lowercase)
  answer: String,          // The response text
  threadID: String,        // Chat thread ID
  authorID: String,        // Who taught this response
  authorName: String,      // Author's name
  createdAt: Date,         // When it was created
  updatedAt: Date,         // Last modification
  usageCount: Number,      // How many times used
  isActive: Boolean,       // If response is active
  lastUsed: Date,          // Last time this response was used
  respondedMessages: [{    // Messages already responded to
    messageID: String,
    timestamp: Date
  }]
}
```

### 🎯 Matching Algorithm

1. **Exact Match** (100% accuracy)
   - Direct string comparison with the stored question

2. **Partial Match** (High accuracy)
   - Uses regex to find partial matches
   - Supports both directions (question in message, message in question)

3. **Similarity Match** (30%+ accuracy)
   - Uses Dice coefficient algorithm
   - Only responds if similarity ≥ 30%
   - Randomly selects from top similar matches

### 🚫 Anti-Duplication System

- Tracks message IDs that have been responded to
- Prevents multiple responses to the same message
- Maintains a rolling list of last 100 responded messages per response
- Works across bot restarts (persistent storage)

## 🎮 Examples

### Teaching Examples

```bash
# Greetings
.teach hello | Hello! Nice to meet you! 😊
.teach hi | Hey there! What's up?
.teach good morning | Good morning! Hope you have a great day!

# Questions
.teach what's your name | I'm Shizuka, your friendly bot assistant!
.teach how old are you | I'm timeless, but I was created recently!
.teach what can you do | I can chat with you and learn new responses!

# Fun responses
.teach tell me a joke | Why don't scientists trust atoms? Because they make up everything! 😄
.teach sing a song | 🎵 La la la, I'm just a happy bot! 🎵
.teach dance | 💃 *bot dancing intensifies* 💃
```

### Automatic Response Examples

**User:** "hello"
**Bot:** "Hello! Nice to meet you! 😊"

**User:** "good morning everyone"
**Bot:** "Good morning! Hope you have a great day!"

**User:** "what is your name?"
**Bot:** "I'm Shizuka, your friendly bot assistant!" *(closest match to "what's your name")*

## ⚙️ Configuration

### Response Similarity Threshold
Default: 30% (0.3)
Location: `teach.js` line 360

```javascript
if (similarities[0].similarity >= 0.3) {
```

### Message History Limit
Default: 100 messages per response
Location: `teachModel.js` line 82

```javascript
if (this.respondedMessages.length >= 100) {
```

### Response Selection Range
Default: Picks from responses within 10% similarity of the top match
Location: `teach.js` line 363

```javascript
const topMatches = similarities.filter(s => s.similarity >= topSimilarity - 0.1);
```

## 🛡️ Security Features

- **Thread Isolation**: Each chat thread has separate responses
- **User Attribution**: Tracks who created each response
- **Soft Delete**: Responses are marked inactive, not deleted
- **Input Validation**: Prevents malformed data
- **Rate Limiting**: Built into main command structure

## 📈 Performance

- **Indexed Queries**: MongoDB indexes for fast searches
- **Text Search**: Full-text search capabilities
- **Optimized Matching**: Hierarchical matching (fast to slow)
- **Memory Efficient**: Limits stored message history

## 🐛 Troubleshooting

### Common Issues

1. **Bot not responding:**
   - Check if responses exist: `.teach list`
   - Verify similarity threshold (try exact matches first)
   - Check console for errors

2. **Duplicate teaching:**
   - Use `.teach remove <question>` first
   - Check existing responses: `.teach search <keyword>`

3. **MongoDB connection:**
   - Verify config.json database settings
   - Run test script: `node test-teach.js`

### Debug Mode

Add this to enable debug logging:

```javascript
// In teach.js, add to onChat function:
console.log(`[DEBUG] Message: "${body}"`);
console.log(`[DEBUG] Found responses: ${allResponses.length}`);
```

## 🔄 Updates & Maintenance

### Regular Maintenance
- Monitor response usage with `.teach stats`
- Remove outdated responses periodically
- Check database size and performance

### Backup
- MongoDB data is automatically backed up
- Export specific thread data if needed
- Consider implementing automated cleanup for old unused responses

---

## 🎉 Success! 

Your AI Teach System is now ready! The bot will:

✅ Learn from your teachings
✅ Respond intelligently to similar messages  
✅ Avoid duplicate responses
✅ Get smarter over time
✅ Maintain persistent memory across restarts

**Happy teaching! 🎓**