#!/usr/bin/env node
/**
 * Deployment Platform Decision Helper
 * Run with: node choose-platform.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  🚀 Attendance Automation - Deployment Platform Helper    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const questions = [
  {
    q: 'Is this for production or just testing?',
    answers: ['Production', 'Testing/Development'],
    key: 'purpose'
  },
  {
    q: 'Do you need automatic daily attendance checks?',
    answers: ['Yes, definitely', 'No, manual is fine'],
    key: 'autochecks'
  },
  {
    q: 'Do you want the Telegram bot to work 24/7?',
    answers: ['Yes, always online', 'No, on-demand is okay'],
    key: 'telegram'
  },
  {
    q: 'What\'s your budget?',
    answers: ['Free only', 'Can pay $5-10/month', 'Budget not a concern'],
    key: 'budget'
  },
  {
    q: 'How important is ease of setup?',
    answers: ['Very - want it simple', 'Don\'t mind complexity'],
    key: 'ease'
  }
];

const responses = {};
let currentQ = 0;

function askQuestion() {
  if (currentQ >= questions.length) {
    showRecommendation();
    return;
  }

  const question = questions[currentQ];
  console.log(`\n📋 Question ${currentQ + 1}/${questions.length}:`);
  console.log(`   ${question.q}\n`);
  
  question.answers.forEach((answer, idx) => {
    console.log(`   ${idx + 1}. ${answer}`);
  });

  rl.question('\n   Your choice (1-' + question.answers.length + '): ', (answer) => {
    const choice = parseInt(answer) - 1;
    if (choice >= 0 && choice < question.answers.length) {
      responses[question.key] = choice;
      currentQ++;
      askQuestion();
    } else {
      console.log('   ❌ Invalid choice. Please try again.');
      askQuestion();
    }
  });
}

function showRecommendation() {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  📊 RECOMMENDATION                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Decision logic
  let recommendation = '';
  let reason = '';
  let steps = [];

  // If they need autochecks and 24/7 telegram, Netlify won't work
  if (responses.autochecks === 0 && responses.telegram === 0) {
    // Need full features
    if (responses.budget === 0) {
      // Free only
      recommendation = '🏆 RAILWAY (Free Tier)';
      reason = 'You need full features (auto-checks + 24/7 bot) on a free budget.';
      steps = [
        'npm install -g @railway/cli',
        'railway login',
        'railway init',
        'railway up',
        'Done! Your app is deployed with all features.'
      ];
    } else if (responses.budget === 1) {
      // Can pay a bit
      recommendation = '🏆 RAILWAY (Paid) or RENDER';
      reason = 'Both offer full features. Railway is simpler, Render has more hours.';
      steps = [
        'Railway: railway login && railway up',
        'Or Render: Connect GitHub repo in Render dashboard',
        'Both support all your features perfectly.'
      ];
    } else {
      // Budget not a concern
      recommendation = '🏆 HEROKU or RENDER';
      reason = 'Most mature platforms with excellent support.';
      steps = [
        'Heroku: heroku create && git push heroku main',
        'Or Render: Deploy via web UI',
        'Both are battle-tested and reliable.'
      ];
    }
  } else if (responses.autochecks === 1 && responses.telegram === 1) {
    // Don't need full features
    if (responses.ease === 0) {
      // Want simple
      recommendation = '✅ NETLIFY (Hybrid Mode)';
      reason = 'Since you don\'t need auto-checks or 24/7 bot, Netlify works fine.';
      steps = [
        'netlify login',
        'netlify init',
        'netlify deploy --prod',
        'Set up Telegram webhook (see NETLIFY_QUICK_START.md)',
        'Manual attendance checks via web interface.'
      ];
    } else {
      // Don't mind complexity
      recommendation = '🏆 RAILWAY (Simplest)';
      reason = 'Even though you don\'t need all features, Railway is easiest.';
      steps = [
        'railway login',
        'railway up',
        'That\'s it! Everything works.'
      ];
    }
  } else {
    // Mixed requirements
    recommendation = '🏆 RAILWAY';
    reason = 'Best balance of features, ease, and cost.';
    steps = [
      'npm install -g @railway/cli',
      'railway login',
      'railway init',
      'railway up',
      'All features work perfectly!'
    ];
  }

  console.log(`   ${recommendation}\n`);
  console.log(`   💡 Why: ${reason}\n`);
  console.log('   📝 Quick Setup Steps:\n');
  steps.forEach((step, idx) => {
    console.log(`      ${idx + 1}. ${step}`);
  });

  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  📚 DOCUMENTATION                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (recommendation.includes('NETLIFY')) {
    console.log('   📖 Read: NETLIFY_QUICK_START.md');
    console.log('   📖 Full Guide: NETLIFY_DEPLOYMENT.md');
  } else if (recommendation.includes('RAILWAY')) {
    console.log('   📖 Railway is already configured!');
    console.log('   📖 See: railway.json and DEPLOYMENT_GUIDE.md');
  } else if (recommendation.includes('RENDER')) {
    console.log('   📖 Render is already configured!');
    console.log('   📖 See: render.yaml and DEPLOYMENT_GUIDE.md');
  }

  console.log('\n   📊 Compare all platforms: PLATFORM_COMPARISON_DETAILED.md\n');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 GOOD LUCK!                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  rl.close();
}

// Start the questionnaire
askQuestion();
