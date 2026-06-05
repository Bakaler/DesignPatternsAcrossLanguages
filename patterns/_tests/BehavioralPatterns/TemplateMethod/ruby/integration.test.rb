# ============================================================
#  Integration Tests — Template Method: Data Pipeline (Ruby)
#  Run: rspec integration.test.rb
# ============================================================

require 'rspec'
require 'stringio'
require 'set'
require_relative '../../../../BehavioralPatterns/TemplateMethod/ruby/ruby'

def capture(&block)
  old = $stdout
  $stdout = StringIO.new
  block.call
  $stdout.string.lines.map(&:chomp)
ensure
  $stdout = old
end

STEP_LABELS = %w[[Extract] [Transform] [Validate] [Load] [Report]].freeze

# ── CSV full run ──────────────────────────────────────────────
RSpec.describe 'CsvPipeline — full run()' do
  let(:lines) { capture { CsvPipeline.new.run } }
  let(:out)   { lines.join("\n") }

  it 'all five step labels present' do
    STEP_LABELS.each { |l| expect(out).to include(l) }
  end

  it 'validate catches missing name' do
    expect(lines).to include(a_string_including('1 error(s)'))
  end

  it 'report shows warning' do
    expect(lines).to include(a_string_including('!').and(include('name')))
  end

  it 'Alice and Bob appear in load output' do
    expect(out).to include('Alice')
    expect(out).to include('Bob')
  end

  it 'whitespace trimmed' do
    expect(out).not_to include('  Bob  ')
  end
end

# ── JSON full run ─────────────────────────────────────────────
RSpec.describe 'JsonPipeline — full run()' do
  let(:lines) { capture { JsonPipeline.new.run } }
  let(:out)   { lines.join("\n") }

  it 'all five step labels present' do
    STEP_LABELS.each { |l| expect(out).to include(l) }
  end

  it 'no validation errors' do
    expect(lines).to include(a_string_including('0 error(s)'))
  end

  it 'nested key appears flattened' do
    expect(out).to include('meta_role')
  end

  it 'coerced age in output' do
    expect(out).to include('age:31')
  end

  it 'all three names in output' do
    %w[Dave Eve Frank].each { |n| expect(out).to include(n) }
  end
end

# ── XML full run ──────────────────────────────────────────────
RSpec.describe 'XmlPipeline — full run()' do
  let(:lines) { capture { XmlPipeline.new.run } }
  let(:out)   { lines.join("\n") }

  it 'all five step labels present' do
    STEP_LABELS.each { |l| expect(out).to include(l) }
  end

  it 'no validation errors' do
    expect(lines).to include(a_string_including('0 error(s)'))
  end

  it 'coerced bool in output' do
    expect(out).to include('active:true')
    expect(out).to include('active:false')
  end

  it 'float score in output' do
    expect(out).to include('9.4')
  end

  it 'all three names in output' do
    %w[Grace Henry Isla].each { |n| expect(out).to include(n) }
  end
end

# ── Shared skeleton ───────────────────────────────────────────
RSpec.describe 'Shared skeleton across all pipelines' do
  def run(pipe) = capture { pipe.run }.join("\n")

  it 'all pipelines share the same step labels' do
    [CsvPipeline.new, JsonPipeline.new, XmlPipeline.new].each do |pipe|
      out = run(pipe)
      STEP_LABELS.each { |l| expect(out).to include(l) }
    end
  end

  it 'extract always before transform' do
    [CsvPipeline.new, JsonPipeline.new, XmlPipeline.new].each do |pipe|
      out = run(pipe)
      expect(out.index('[Extract]')).to be < out.index('[Transform]')
    end
  end

  it 'validate always after transform' do
    [CsvPipeline.new, JsonPipeline.new, XmlPipeline.new].each do |pipe|
      out = run(pipe)
      expect(out.index('[Transform]')).to be < out.index('[Validate]')
    end
  end

  it 'report always last' do
    [CsvPipeline.new, JsonPipeline.new, XmlPipeline.new].each do |pipe|
      out = run(pipe)
      expect(out.index('[Load]')).to be < out.index('[Report]')
    end
  end
end

# ── Hook override ─────────────────────────────────────────────
RSpec.describe 'Hook override' do
  it 'overriding report changes only the last step' do
    custom = Class.new(CsvPipeline) { def report = puts "  [Report]    suppressed" }
    out = capture { custom.new.run }.join("\n")
    expect(out).to include('suppressed')
    expect(out).not_to include('No issues.')
    expect(out).to include('[Extract]')
    expect(out).to include('[Validate]')
  end
end
