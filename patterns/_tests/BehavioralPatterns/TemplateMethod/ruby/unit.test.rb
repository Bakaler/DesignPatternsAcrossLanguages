# ============================================================
#  Unit Tests — Template Method: Data Pipeline (Ruby)
#  Run: rspec unit.test.rb
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

# Helper: minimal concrete subclass for testing base behaviour
def make_pipeline(records = [])
  Class.new(DataPipeline) do
    define_method(:name) { "TestPipe" }
    define_method(:extract)   { @records = records }
    define_method(:transform) { }
    define_method(:run_validate) { validate }
    define_method(:run_load)     { load }
    define_method(:run_report)   { report }
    define_method(:errs)         { @errors }
  end.new
end

# ── validate() ───────────────────────────────────────────────
RSpec.describe 'DataPipeline#validate' do
  it 'passes records with id and name' do
    p = make_pipeline([{ id: '1', name: 'Alice' }])
    capture { p.run_validate }
    expect(p.errs).to be_empty
  end

  it 'catches missing name' do
    p = make_pipeline([{ id: '1', name: nil }])
    capture { p.run_validate }
    expect(p.errs).to include(a_string_including('name'))
  end

  it 'catches missing id' do
    p = make_pipeline([{ id: nil, name: 'Alice' }])
    capture { p.run_validate }
    expect(p.errs).to include(a_string_including("'id'"))
  end

  it 'output line contains "records checked"' do
    p = make_pipeline([{ id: '1', name: 'Alice' }])
    lines = capture { p.run_validate }
    expect(lines).to include(a_string_including('records checked'))
  end
end

# ── report() hook ────────────────────────────────────────────
RSpec.describe 'DataPipeline#report hook' do
  it 'prints "No issues." when no errors' do
    p = make_pipeline([])
    out = capture { p.run_report }.join("\n")
    expect(out).to include('No issues.')
  end

  it 'prints warning when errors exist' do
    p = make_pipeline([])
    p.instance_variable_set(:@errors, ["row 0: missing required field 'name'"])
    out = capture { p.run_report }.join("\n")
    expect(out).to include('!')
  end

  it 'can be overridden in a subclass' do
    custom = Class.new(CsvPipeline) do
      def report = puts "CUSTOM REPORT"
    end
    out = capture { custom.new.run }.join("\n")
    expect(out).to include('CUSTOM REPORT')
    expect(out).not_to include('No issues.')
  end
end

# ── CsvPipeline ───────────────────────────────────────────────
RSpec.describe CsvPipeline do
  subject(:pipe) { described_class.new }

  it 'extract loads 3 records' do
    capture { pipe.send(:extract) }
    expect(pipe.instance_variable_get(:@records).size).to eq 3
  end

  it 'transform trims whitespace' do
    capture { pipe.send(:extract) }
    capture { pipe.send(:transform) }
    names = pipe.instance_variable_get(:@records).map { |r| r[:name] }
    expect(names).to include('Bob')
    expect(names).not_to include('  Bob  ')
  end

  it 'transform converts empty string to nil' do
    capture { pipe.send(:extract) }
    capture { pipe.send(:transform) }
    expect(pipe.instance_variable_get(:@records)[2][:name]).to be_nil
  end
end

# ── JsonPipeline ──────────────────────────────────────────────
RSpec.describe JsonPipeline do
  subject(:pipe) { described_class.new }

  it 'extract loads 3 records' do
    capture { pipe.send(:extract) }
    expect(pipe.instance_variable_get(:@records).size).to eq 3
  end

  it 'transform flattens nested hash' do
    capture { pipe.send(:extract) }
    capture { pipe.send(:transform) }
    rec = pipe.instance_variable_get(:@records)[0]
    expect(rec).to have_key(:meta_role)
    expect(rec).not_to have_key(:meta)
  end

  it 'transform coerces numeric string to integer' do
    capture { pipe.send(:extract) }
    capture { pipe.send(:transform) }
    expect(pipe.instance_variable_get(:@records)[0][:age]).to eq 31
  end
end

# ── XmlPipeline ───────────────────────────────────────────────
RSpec.describe XmlPipeline do
  subject(:pipe) { described_class.new }

  it 'extract loads 3 records' do
    capture { pipe.send(:extract) }
    expect(pipe.instance_variable_get(:@records).size).to eq 3
  end

  it 'transform coerces int' do
    capture { pipe.send(:extract) }
    capture { pipe.send(:transform) }
    expect(pipe.instance_variable_get(:@records)[0][:id]).to eq 1
  end

  it 'transform coerces float' do
    capture { pipe.send(:extract) }
    capture { pipe.send(:transform) }
    expect(pipe.instance_variable_get(:@records)[0][:score]).to eq 9.4
  end

  it 'transform coerces bool true' do
    capture { pipe.send(:extract) }
    capture { pipe.send(:transform) }
    expect(pipe.instance_variable_get(:@records)[0][:active]).to be true
  end

  it 'transform coerces bool false' do
    capture { pipe.send(:extract) }
    capture { pipe.send(:transform) }
    expect(pipe.instance_variable_get(:@records)[1][:active]).to be false
  end
end

# ── run() step order ─────────────────────────────────────────
RSpec.describe 'run() step ordering' do
  it 'calls steps in the correct order' do
    order = []
    spy = Class.new(DataPipeline) do
      define_method(:name)      { 'Spy' }
      define_method(:extract)   { order << 'extract'; @records = [{ id: '1', name: 'X' }] }
      define_method(:transform) { order << 'transform' }
      define_method(:validate)  { order << 'validate'; @errors = [] }
      define_method(:load)      { order << 'load' }
      define_method(:report)    { order << 'report' }
    end
    capture { spy.new.run }
    expect(order).to eq %w[extract transform validate load report]
  end
end
