#!/usr/bin/env node
// ============================================================
//  run-tests.js  —  Multi-language test runner
//
//  Usage:
//    node run-tests.js                  run everything
//    node run-tests.js --lang ts        only TypeScript
//    node run-tests.js --lang python    only Python
//    node run-tests.js --lang java,python  comma-separated
//    node run-tests.js --pattern Interpreter
//    node run-tests.js --type unit      only unit tests
//    node run-tests.js --type integration
//    node run-tests.js --help
//
//  Aliases: ts | typescript, py | python, cs | csharp, rb | ruby
// ============================================================

const { spawnSync } = require('child_process');
const fs            = require('fs');
const path          = require('path');

// ── ANSI colours ─────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};
const ok    = s => `${C.green}${s}${C.reset}`;
const fail  = s => `${C.red}${s}${C.reset}`;
const warn  = s => `${C.yellow}${s}${C.reset}`;
const dim   = s => `${C.dim}${s}${C.reset}`;
const bold  = s => `${C.bold}${s}${C.reset}`;
const cyan  = s => `${C.cyan}${s}${C.reset}`;

// ── Paths ─────────────────────────────────────────────────────
const ROOT       = __dirname;
const TESTS_DIR  = path.join(ROOT, 'patterns', '_tests');
const TOOLS_DIR  = path.join(ROOT, 'tools');
const JUNIT_DIR  = path.join(TOOLS_DIR, 'junit');

// ── Arg parsing ───────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  ${bold('run-tests.js')}  — Design Patterns multi-language test runner

  ${bold('Usage:')}
    node run-tests.js [options]

  ${bold('Options:')}
    --lang  <langs>    comma-separated languages to run
                       ts, typescript, java, cs, csharp, py, python, rb, ruby
    --pattern <name>   filter by pattern name (e.g. Interpreter, Facade)
    --type  <type>     unit | integration  (default: both)
    --help             show this message

  ${bold('Prerequisites by language:')}
    TypeScript  node run-tests.js --lang ts    (always available)
    Python      pip install pytest
    Ruby        gem install minitest  (included in Ruby stdlib; just needs Ruby)
    Java        JUnit jars in tools/junit/  (auto-downloaded if curl available)
    C#          dotnet SDK 9+  (dotnet test)
    C++         g++ in PATH
  `);
  process.exit(0);
}

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const LANG_FILTER    = getArg('--lang');
const PATTERN_FILTER = getArg('--pattern');
const TYPE_FILTER    = getArg('--type');

const LANG_ALIASES = {
  ts: 'typescript', typescript: 'typescript',
  py: 'python',     python: 'python',
  rb: 'ruby',       ruby: 'ruby',
  cs: 'csharp',     csharp: 'csharp',
  java: 'java',
};

const ENABLED_LANGS = LANG_FILTER
  ? LANG_FILTER.split(',').map(l => LANG_ALIASES[l.trim().toLowerCase()]).filter(Boolean)
  : ['typescript', 'python', 'ruby', 'java', 'csharp'];

const ENABLED_TYPES = TYPE_FILTER
  ? [TYPE_FILTER]
  : ['unit', 'integration'];

// ── Tool detection ────────────────────────────────────────────
function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd],
                      { encoding: 'utf8', shell: true });
  return r.status === 0;
}

function pythonWorks() {
  // The Windows Store stub answers 'where python' but exits with error output.
  // Actually run python --version and check the output says "Python 3".
  for (const cmd of ['python', 'python3']) {
    const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: true });
    const out = (r.stdout || '') + (r.stderr || '');
    if (r.status === 0 && /Python 3/i.test(out)) return true;
  }
  return false;
}

const HAS = {
  node:   true,
  python: pythonWorks(),
  ruby:   which('ruby'),
  java:   which('javac') && which('java'),
  dotnet: which('dotnet'),
};

// ── JUnit jar helpers ─────────────────────────────────────────
const JUNIT4_JAR    = path.join(JUNIT_DIR, 'junit-4.13.2.jar');
const HAMCREST_JAR  = path.join(JUNIT_DIR, 'hamcrest-core-1.3.jar');
const JUNIT5_JAR    = path.join(JUNIT_DIR, 'junit-platform-console-standalone-1.11.3.jar');

function downloadFile(url, dest) {
  const curl = spawnSync('curl', ['-fsSL', '-o', dest, url], { encoding: 'utf8', shell: true });
  if (curl.status === 0) return true;
  const ps = spawnSync(
    'powershell',
    ['-NoProfile', '-Command', `Invoke-WebRequest -Uri '${url}' -OutFile '${dest}'`],
    { encoding: 'utf8', shell: false },
  );
  return ps.status === 0;
}

function ensureJUnit4() {
  if (fs.existsSync(JUNIT4_JAR) && fs.existsSync(HAMCREST_JAR)) return true;
  console.log(dim('  JUnit 4 jars not found, attempting download...'));
  fs.mkdirSync(JUNIT_DIR, { recursive: true });
  const downloads = [
    ['https://repo1.maven.org/maven2/junit/junit/4.13.2/junit-4.13.2.jar',         JUNIT4_JAR],
    ['https://repo1.maven.org/maven2/org/hamcrest/hamcrest-core/1.3/hamcrest-core-1.3.jar', HAMCREST_JAR],
  ];
  for (const [url, dest] of downloads) {
    if (!downloadFile(url, dest)) {
      console.log(warn(`  Could not download ${path.basename(dest)}. Place JUnit 4 jars in ${JUNIT_DIR}/`));
      return false;
    }
  }
  return true;
}

function ensureJUnit5() {
  if (fs.existsSync(JUNIT5_JAR)) return true;
  console.log(dim('  JUnit 5 standalone jar not found, attempting download...'));
  fs.mkdirSync(JUNIT_DIR, { recursive: true });
  const url = 'https://repo1.maven.org/maven2/org/junit/platform/junit-platform-console-standalone/1.11.3/junit-platform-console-standalone-1.11.3.jar';
  if (!downloadFile(url, JUNIT5_JAR)) {
    console.log(warn(`  Could not download JUnit 5 standalone. Place it in ${JUNIT_DIR}/`));
    return false;
  }
  return true;
}

function isJUnit5(testFile) {
  try {
    return fs.readFileSync(testFile, 'utf8').includes('org.junit.jupiter');
  } catch { return false; }
}

// ── C# project helper ─────────────────────────────────────────
function ensureCsProj(testDir) {
  const proj = path.join(testDir, 'TestProject.csproj');
  if (fs.existsSync(proj)) return;
  // Find the implementation .cs file two levels up
  // e.g. patterns/_tests/BehavioralPatterns/Interpreter/csharp  ->  patterns/BehavioralPatterns/Interpreter/csharp/csharp.cs
  const parts   = testDir.split(path.sep);
  const testIdx = parts.lastIndexOf('_tests');
  const implCs  = path.join(
    ROOT, 'patterns',
    parts.slice(testIdx + 1, -1).join(path.sep),  // category/pattern
    'csharp', 'csharp.cs'
  );

  const implInclude = fs.existsSync(implCs)
    ? `    <Compile Include="${path.relative(testDir, implCs).replace(/\\/g, '/')}" />\n`
    : '';

  const xml = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
    <DefineConstants>TESTING</DefineConstants>
    <OutputType>Library</OutputType>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk"       Version="17.9.0" />
    <PackageReference Include="xunit"                        Version="2.7.0"  />
    <PackageReference Include="xunit.runner.visualstudio"    Version="2.5.7"  />
  </ItemGroup>
  <ItemGroup>
${implInclude}  </ItemGroup>
</Project>
`;
  fs.writeFileSync(proj, xml);
}

// ── Run a single test file ────────────────────────────────────
function runTest(lang, category, pattern, type, testDir, implDir) {
  const ext = { typescript: 'ts', python: 'py', ruby: 'rb', java: 'java', csharp: 'cs' }[lang];
  const testFile = path.join(testDir, `${type}.test.${ext}`);
  if (!fs.existsSync(testFile)) return null;  // no test for this combo

  let cmd, cmdArgs, opts;
  const cwd = testDir;

  if (lang === 'typescript') {
    cmd     = 'npx';
    cmdArgs = ['mocha', '--require', 'ts-node/register', `${type}.test.ts`];
    opts    = { cwd, encoding: 'utf8', shell: true };
  }

  else if (lang === 'python') {
    const py = which('python3') ? 'python3' : 'python';
    cmd      = py;
    cmdArgs  = ['-m', 'pytest', `${type}.test.py`, '-v', '--tb=short', '--import-mode=importlib'];
    opts     = { cwd, encoding: 'utf8', shell: true };
  }

  else if (lang === 'ruby') {
    cmd     = 'ruby';
    cmdArgs = [`${type}.test.rb`];
    opts    = { cwd, encoding: 'utf8', shell: true };
  }

  else if (lang === 'java') {
    const junit5   = isJUnit5(testFile);
    const sep      = process.platform === 'win32' ? ';' : ':';
    const implFile = path.join(implDir, 'java.java');

    // Java requires public class name == filename. Copy test file to ClassName.java,
    // compile, run, then clean up the copy and .class files.
    const src   = fs.readFileSync(testFile, 'utf8');
    const match = src.match(/^(?:public\s+)?class (\w+)/m);
    const cls   = match ? match[1] : (type === 'unit' ? 'UnitTests' : 'IntegrationTests');
    const tmpFile = path.join(cwd, `${cls}.java`);
    fs.copyFileSync(testFile, tmpFile);

    let compileResult, runResult;
    try {
      if (junit5) {
        if (!ensureJUnit5()) return { skipped: true, reason: 'JUnit 5 jar unavailable' };
        const cp  = ['.', JUNIT5_JAR].join(sep);
        compileResult = spawnSync('javac', ['-cp', cp, '-d', '.', implFile, tmpFile], { cwd, encoding: 'utf8' });
        if (compileResult.status !== 0) return { passed: false, output: compileResult.stderr || compileResult.stdout };
        runResult = spawnSync('java', [
          '-jar', JUNIT5_JAR, 'execute',
          '--classpath', '.', '--select-class', cls, '--fail-if-no-tests',
        ], { cwd, encoding: 'utf8' });
      } else {
        if (!ensureJUnit4()) return { skipped: true, reason: 'JUnit 4 jars unavailable' };
        const cp  = ['.', JUNIT4_JAR, HAMCREST_JAR].join(sep);
        compileResult = spawnSync('javac', ['-cp', cp, '-d', '.', implFile, tmpFile], { cwd, encoding: 'utf8' });
        if (compileResult.status !== 0) return { passed: false, output: compileResult.stderr || compileResult.stdout };
        runResult = spawnSync('java', ['-cp', cp, 'org.junit.runner.JUnitCore', cls], { cwd, encoding: 'utf8' });
      }
    } finally {
      // Clean up temp files
      try { fs.unlinkSync(tmpFile); } catch {}
      try {
        fs.readdirSync(cwd).filter(f => f.endsWith('.class')).forEach(f => {
          try { fs.unlinkSync(path.join(cwd, f)); } catch {}
        });
      } catch {}
    }
    return { passed: runResult.status === 0, output: runResult.stdout + runResult.stderr };
  }

  else if (lang === 'csharp') {
    ensureCsProj(testDir);
    cmd     = 'dotnet';
    cmdArgs = ['test', '--nologo', '-v', 'minimal'];
    opts    = { cwd, encoding: 'utf8', shell: true };
  }

  else {
    return null;
  }

  const result = spawnSync(cmd, cmdArgs, { ...opts, timeout: 60000 });
  return {
    passed: result.status === 0,
    output: (result.stdout || '') + (result.stderr || ''),
  };
}

// ── Discover all test entries ─────────────────────────────────
function discoverTests() {
  const entries = [];
  for (const category of fs.readdirSync(TESTS_DIR)) {
    const catDir = path.join(TESTS_DIR, category);
    if (!fs.statSync(catDir).isDirectory()) continue;
    // category-level filter: skip only if we know no pattern in this category can match
    if (PATTERN_FILTER && !fs.readdirSync(catDir).some(p => p.toLowerCase().includes(PATTERN_FILTER.toLowerCase()))) continue;

    for (const pattern of fs.readdirSync(catDir)) {
      const patDir = path.join(catDir, pattern);
      if (!fs.statSync(patDir).isDirectory()) continue;
      if (PATTERN_FILTER && !pattern.toLowerCase().includes(PATTERN_FILTER.toLowerCase())) continue;

      for (const lang of fs.readdirSync(patDir)) {
        if (!ENABLED_LANGS.includes(lang)) continue;
        const testDir = path.join(patDir, lang);
        if (!fs.statSync(testDir).isDirectory()) continue;
        const implDir = path.join(ROOT, 'patterns', category, pattern, lang);

        for (const type of ENABLED_TYPES) {
          const ext = { typescript: 'ts', python: 'py', ruby: 'rb', java: 'java', csharp: 'cs' }[lang];
          if (fs.existsSync(path.join(testDir, `${type}.test.${ext}`))) {
            entries.push({ category, pattern, lang, type, testDir, implDir });
          }
        }
      }
    }
  }
  return entries;
}

// ── Main ──────────────────────────────────────────────────────
function main() {
  console.log(`\n${bold('Design Patterns — Test Runner')}`);
  console.log(dim('═'.repeat(60)));

  // Availability report
  const unavailable = ENABLED_LANGS.filter(l => {
    if (l === 'typescript') return !HAS.node;
    if (l === 'python')     return !HAS.python;
    if (l === 'ruby')       return !HAS.ruby;
    if (l === 'java')       return !HAS.java;
    if (l === 'csharp')     return !HAS.dotnet;
    return false;
  });

  if (unavailable.length) {
    console.log(warn(`\n  Skipping (runtime not found): ${unavailable.join(', ')}`));
    console.log(dim('  Run  node run-tests.js --help  for install instructions.\n'));
  }

  const entries = discoverTests().filter(e => {
    if (e.lang === 'typescript') return HAS.node;
    if (e.lang === 'python')     return HAS.python;
    if (e.lang === 'ruby')       return HAS.ruby;
    if (e.lang === 'java')       return HAS.java;
    if (e.lang === 'csharp')     return HAS.dotnet;
    return false;
  });

  if (!entries.length) {
    console.log(warn('  No tests found for the given filters.\n'));
    process.exit(0);
  }

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const failures = [];

  let lastPattern = null;
  for (const { category, pattern, lang, type, testDir, implDir } of entries) {
    const label = `${pattern}/${lang}/${type}`;
    if (pattern !== lastPattern) {
      console.log(`\n${cyan(pattern)}  ${dim(category)}`);
      lastPattern = pattern;
    }
    process.stdout.write(`  ${dim(lang.padEnd(12))} ${type.padEnd(12)} `);

    const r = runTest(lang, category, pattern, type, testDir, implDir);

    if (!r) {
      process.stdout.write(dim('skipped\n'));
      totalSkipped++;
    } else if (r.skipped) {
      process.stdout.write(warn(`skipped  (${r.reason})\n`));
      totalSkipped++;
    } else if (r.passed) {
      process.stdout.write(ok('PASS\n'));
      totalPassed++;
    } else {
      process.stdout.write(fail('FAIL\n'));
      totalFailed++;
      failures.push({ label, output: r.output });
    }
  }

  // Failure details
  if (failures.length) {
    console.log(`\n${fail('─── FAILURES ───────────────────────────────────────────────')}`);
    for (const { label, output } of failures) {
      console.log(`\n${fail('▶')} ${bold(label)}`);
      console.log(dim(output.trim().split('\n').map(l => '    ' + l).join('\n')));
    }
  }

  // Summary
  console.log(`\n${dim('═'.repeat(60))}`);
  const parts = [];
  if (totalPassed)  parts.push(ok(`${totalPassed} passed`));
  if (totalFailed)  parts.push(fail(`${totalFailed} failed`));
  if (totalSkipped) parts.push(dim(`${totalSkipped} skipped`));
  console.log(`  ${parts.join('  ')}  ${dim('—')}  ${dim(entries.length + ' total')}\n`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
