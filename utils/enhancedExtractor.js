/**
 * Enhanced Attendance Extraction Script
 * Uses patterns from browser extension to extract attendance from various page structures
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { decryptPassword } = require('./utils/encryption');

puppeteer.use(StealthPlugin());

async function extractAttendanceWithMultiplePatterns(page) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ENHANCED ATTENDANCE EXTRACTION (Browser Extension Patterns)');
  console.log('='.repeat(80));
  
  const result = await page.evaluate(() => {
    const subjects = [];
    const debugInfo = {
      patterns: [],
      tablesFound: 0,
      fieldsetsFound: 0,
      coloredSpansFound: 0,
      pageUrl: window.location.href,
      pageTitle: document.title
    };

    console.log('[Extract] Starting extraction with multiple patterns...');

    // PATTERN 1: Traditional HTML Table (MITS specific)
    console.log('[Extract] Pattern 1: Traditional HTML table...');
    const tables = document.querySelectorAll('table');
    debugInfo.tablesFound = tables.length;
    
    tables.forEach((table, tableIndex) => {
      const rows = table.querySelectorAll('tr');
      console.log(`[Extract] Table ${tableIndex + 1}: ${rows.length} rows`);
      
      // Check if this table has attendance headers
      const tableText = table.textContent.toLowerCase();
      if (tableText.includes('subject') && 
          (tableText.includes('attendance') || tableText.includes('percentage'))) {
        
        console.log(`[Extract] Table ${tableIndex + 1} looks like attendance table`);
        
        rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 4) {
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            
            // Skip header rows
            const rowText = cellTexts.join(' ').toLowerCase();
            if (rowText.includes('s.no') || rowText.includes('subject code') ||
                rowText.includes('attendance')) {
              return;
            }
            
            // Try to extract attendance data
            const sno = cellTexts[0];
            if (sno && !isNaN(parseInt(sno))) {
              const subjectCode = cellTexts[1] || 'Subject';
              const attended = parseInt(cellTexts[2]) || 0;
              const total = parseInt(cellTexts[3]) || 0;
              let percentage = 0;
              
              // Try to get percentage from column 4 or calculate it
              if (cellTexts[4]) {
                const match = cellTexts[4].match(/(\d+\.?\d*)/);
                if (match) percentage = parseFloat(match[1]);
              }
              if (percentage === 0 && total > 0) {
                percentage = (attended / total * 100);
              }
              
              if (subjectCode && total > 0) {
                subjects.push({
                  name: subjectCode,
                  attendance: percentage,
                  pattern: 'table'
                });
                console.log(`[Extract] Pattern 1 found: ${subjectCode} - ${percentage.toFixed(2)}%`);
              }
            }
          }
        });
      }
    });

    // PATTERN 2: MITSIMS ExtJS semesterActivity fieldset
    if (subjects.length === 0) {
      console.log('[Extract] Pattern 2: MITSIMS semesterActivity fieldset...');
      const semesterActivity = document.getElementById('semesterActivity');
      
      if (semesterActivity) {
        console.log('[Extract] Found semesterActivity element');
        const fieldsets = semesterActivity.querySelectorAll('fieldset.bottom-border');
        debugInfo.fieldsetsFound = fieldsets.length;
        console.log(`[Extract] Found ${fieldsets.length} fieldsets`);
        
        fieldsets.forEach((fieldset, index) => {
          const displayFields = fieldset.querySelectorAll('div[id^="displayfield-"]');
          
          if (displayFields.length >= 5) {
            let subjectCode = null;
            let attendancePercent = null;
            
            displayFields.forEach((field, fieldIndex) => {
              const span = field.querySelector('span');
              if (!span) return;
              
              const text = span.textContent.trim();
              
              // Field 1 is typically subject code
              if (fieldIndex === 1 && !subjectCode) {
                if (/^[A-Z0-9]{3,}$/i.test(text) && text !== 'SUBJECT') {
                  subjectCode = text;
                }
              }
              
              // Field 4 is typically attendance percentage
              if (fieldIndex === 4 && !attendancePercent) {
                const style = span.getAttribute('style') || '';
                if (style.includes('color:')) {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    attendancePercent = value;
                  }
                }
              }
            });
            
            if (subjectCode && attendancePercent !== null) {
              subjects.push({
                name: subjectCode,
                attendance: attendancePercent,
                pattern: 'semesterActivity'
              });
              console.log(`[Extract] Pattern 2 found: ${subjectCode} - ${attendancePercent}%`);
            }
          }
        });
      }
    }

    // PATTERN 3: Colored spans with percentages (MITSIMS alternative format)
    if (subjects.length === 0) {
      console.log('[Extract] Pattern 3: Colored spans...');
      const coloredSpans = document.querySelectorAll('span[style*="color"]');
      debugInfo.coloredSpansFound = coloredSpans.length;
      console.log(`[Extract] Found ${coloredSpans.length} colored spans`);
      
      coloredSpans.forEach(span => {
        const text = span.textContent.trim();
        const match = text.match(/(\d+\.?\d*)/);
        
        if (match) {
          const value = parseFloat(match[1]);
          
          if (value >= 0 && value <= 100) {
            const style = span.getAttribute('style') || '';
            const hasAttendanceColor = style.includes('#04B404') || 
                                      style.includes('#0040FF') ||
                                      style.includes('#FFBF00') ||
                                      style.includes('#FF0000') ||
                                      style.includes('color:green') ||
                                      style.includes('color:blue') ||
                                      style.includes('color:orange') ||
                                      style.includes('color:red');
            
            if (hasAttendanceColor) {
              let subjectName = 'Subject ' + (subjects.length + 1);
              
              const fieldset = span.closest('fieldset');
              if (fieldset) {
                const fieldsetSpans = Array.from(fieldset.querySelectorAll('span'));
                const percentSpanIndex = fieldsetSpans.indexOf(span);
                
                for (let i = percentSpanIndex - 1; i >= 0; i--) {
                  const spanText = fieldsetSpans[i].textContent.trim();
                  if (/^[A-Z0-9]{3,}$/i.test(spanText) &&
                      spanText !== 'CODE' &&
                      spanText !== 'SUBJECT' &&
                      spanText !== 'ATTENDANCE' &&
                      !spanText.includes('%') &&
                      spanText.length < 20) {
                    subjectName = spanText;
                    break;
                  }
                }
              }
              
              if (!subjects.find(s => s.name === subjectName && s.attendance === value)) {
                subjects.push({
                  name: subjectName,
                  attendance: value,
                  pattern: 'coloredSpan'
                });
                console.log(`[Extract] Pattern 3 found: ${subjectName} - ${value}%`);
              }
            }
          }
        }
      });
    }

    // PATTERN 4: Look for ANY percentage-like values in the page
    if (subjects.length === 0) {
      console.log('[Extract] Pattern 4: Any percentage values...');
      const allElements = document.querySelectorAll('*');
      let potentialSubjects = [];
      
      allElements.forEach(element => {
        const text = element.textContent.trim();
        // Only process leaf nodes (no child elements)
        if (element.children.length === 0 && text) {
          const match = text.match(/^(\d+\.?\d*)\s*%?$/);
          if (match) {
            const value = parseFloat(match[1]);
            if (value >= 0 && value <= 100) {
              potentialSubjects.push({
                element: element.tagName,
                text: text,
                value: value,
                parent: element.parentElement?.tagName || 'none'
              });
            }
          }
        }
      });
      
      console.log(`[Extract] Found ${potentialSubjects.length} potential percentage values`);
      
      // Try to pair percentages with subject names
      potentialSubjects.forEach(pot => {
        let subjectName = `Subject ${subjects.length + 1}`;
        
        // Look for subject code nearby
        const container = document.evaluate(
          `./ancestor::*[contains(text(), '${pot.text}')][1]`,
          document.body,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        
        if (container) {
          const containerText = container.textContent;
          // Look for patterns like "CS101", "MATH201", etc.
          const subjectMatch = containerText.match(/([A-Z]{2,}[0-9]{2,})/);
          if (subjectMatch) {
            subjectName = subjectMatch[1];
          }
        }
        
        subjects.push({
          name: subjectName,
          attendance: pot.value,
          pattern: 'anyPercentage'
        });
      });
      
      // Limit to reasonable number
      if (subjects.length > 20) {
        subjects.length = 20;
      }
    }

    console.log(`[Extract] Total subjects found: ${subjects.length}`);
    
    return {
      subjects: subjects,
      debugInfo: debugInfo
    };
  });

  console.log(`\n✅ Extraction complete:`);
  console.log(`   Subjects found: ${result.subjects.length}`);
  console.log(`   Tables scanned: ${result.debugInfo.tablesFound}`);
  console.log(`   Fieldsets scanned: ${result.debugInfo.fieldsetsFound}`);
  console.log(`   Colored spans scanned: ${result.debugInfo.coloredSpansFound}`);
  
  if (result.subjects.length > 0) {
    console.log(`\n📊 Subjects extracted:`);
    result.subjects.forEach((subj, i) => {
      console.log(`   ${i + 1}. ${subj.name}: ${subj.attendance}% (via ${subj.pattern})`);
    });
  }
  
  return result.subjects;
}

module.exports = { extractAttendanceWithMultiplePatterns };
