# ============================================================
#  Template Method: Data Pipeline
#  Run: ruby ruby.rb
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Abstract Class   DataPipeline
#  Concrete Classes CsvPipeline, JsonPipeline, XmlPipeline
#  Client           Entry point
#
#  Template method: DataPipeline#run
#  ────────────────────────────────────────────────────────
#  extract()    ← abstract    format-specific parsing
#  transform()  ← abstract    format-specific cleaning / shaping
#  validate()   ← concrete    shared: checks id + name present
#  load()       ← concrete    shared: prints formatted record table
#  report()     ← hook        default "no issues"; override for custom warnings
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Code reuse          validate() and load() written once, used by all
#  ✓ Enforced sequence   run() is the skeleton; steps cannot be reordered
#  ✓ Hollywood principle base calls subclass, not the other way around
#  ✗ Inheritance lock    a new required step touches the base class
# ============================================================

require 'csv'
require 'json'
require 'rexml/document'


# SECTION:: Abstract Pipeline
# ═════════════════════════════════════════════════════════════
#  ABSTRACT CLASS: DataPipeline
# ═════════════════════════════════════════════════════════════
#  Defines the template method run() and the step contracts.
#  extract() and transform() raise NotImplementedError; subclasses must implement.
#  validate() and load() are concrete; written once and shared by all.
#  report() is a hook with a default implementation; subclasses may override.

class DataPipeline
  def initialize
    @records = []
    @errors  = []
  end

  def name = raise NotImplementedError, "#{self.class}#name"

  # Template method — final by convention. Do not override in subclasses.
  # Defines the invariant sequence: extract → transform → validate → load → report
  def run
    puts "\n  Pipeline : #{name}"
    puts "  " + "─" * 52
    extract
    transform
    validate
    load
    report
  end

  private

  def extract   = raise NotImplementedError, "#{self.class}#extract"
  def transform = raise NotImplementedError, "#{self.class}#transform"

  # Concrete steps — shared logic; never overridden.
  def validate
    @errors    = []
    error_rows = Set.new
    @records.each_with_index do |rec, i|
      if !rec[:id] || rec[:id].to_s.strip.empty?
        @errors << "row #{i}: missing required field 'id'"
        error_rows << i
      end
      if !rec[:name] || rec[:name].to_s.strip.empty?
        @errors << "row #{i}: missing required field 'name'"
        error_rows << i
      end
    end
    passed = @records.size - error_rows.size
    puts "  [Validate]  #{@records.size} records checked: #{passed} passed, #{error_rows.size} error(s)"
  end

  def load
    puts "  [Load]      writing #{@records.size} record(s)"
    @records.each do |rec|
      pairs = rec.map { |k, v| "#{k}:#{v}" }.join("  ")
      puts "              #{pairs}"
    end
  end

  # Hook — default handles errors; subclasses may override for custom messaging.
  def report
    if @errors.any?
      @errors.each { |e| puts "  [Report]  ⚠  #{e}" }
    else
      puts "  [Report]    Pipeline complete. No issues."
    end
  end
end


# SECTION:: CSV Pipeline
# ═════════════════════════════════════════════════════════════
#  CONCRETE: CsvPipeline
# ═════════════════════════════════════════════════════════════
#  extract  : parse comma-separated rows into symbol-keyed records
#  transform: trim whitespace from all values; empty string → nil

CSV_SOURCE = <<~CSV
  id,name,age,city
  1,Alice,30,London
  2,  Bob  ,25,  New York
  3,,28,Paris
CSV
# Row 3 has no name; will be caught by validate()

class CsvPipeline < DataPipeline
  def name = "CSV Data Pipeline"

  private

  def extract
    rows = CSV.parse(CSV_SOURCE, headers: true)
    @records = rows.map { |row| row.to_h.transform_keys(&:to_sym) }
    puts "  [Extract]   #{@records.size} raw rows parsed from CSV source"
  end

  def transform
    @records.each do |rec|
      rec.each_key do |k|
        stripped = rec[k].to_s.strip
        rec[k] = stripped.empty? ? nil : stripped
      end
    end
    puts "  [Transform] whitespace trimmed · empty strings → nil"
  end
end


# SECTION:: JSON Pipeline
# ═════════════════════════════════════════════════════════════
#  CONCRETE: JsonPipeline
# ═════════════════════════════════════════════════════════════
#  extract  : parse a JSON array into symbol-keyed records
#  transform: flatten nested hashes (meta.role → meta_role)
#             coerce numeric strings to Integer or Float

JSON_SOURCE = <<~JSON
  [
    {"id": 1, "name": "Dave",  "age": "31", "meta": {"role": "admin", "level": 3}},
    {"id": 2, "name": "Eve",   "age": "27", "meta": {"role": "user",  "level": 1}},
    {"id": 3, "name": "Frank", "age": "35", "meta": {"role": "mod",   "level": 2}}
  ]
JSON

class JsonPipeline < DataPipeline
  def name = "JSON Data Pipeline"

  private

  def extract
    @records = JSON.parse(JSON_SOURCE, symbolize_names: true)
    puts "  [Extract]   #{@records.size} objects parsed from JSON array"
  end

  def transform
    @records = @records.map do |rec|
      flat = {}
      rec.each do |k, v|
        if v.is_a?(Hash)
          v.each { |nk, nv| flat[:"#{k}_#{nk}"] = nv }
        else
          flat[k] = coerce(v)
        end
      end
      flat
    end
    puts "  [Transform] nested keys flattened · numeric strings coerced"
  end

  def coerce(v)
    return v unless v.is_a?(String)
    Integer(v, exception: false) || Float(v, exception: false) || v
  end
end


# SECTION:: XML Pipeline
# ═════════════════════════════════════════════════════════════
#  CONCRETE: XmlPipeline
# ═════════════════════════════════════════════════════════════
#  extract  : parse <record> elements, preserving type attributes
#  transform: strip type metadata; coerce values (int/float/bool/string)

XML_SOURCE = <<~XML
  <records>
    <record>
      <id type="int">1</id>
      <name type="string">Grace</name>
      <active type="bool">true</active>
      <score type="float">9.4</score>
    </record>
    <record>
      <id type="int">2</id>
      <name type="string">Henry</name>
      <active type="bool">false</active>
      <score type="float">7.8</score>
    </record>
    <record>
      <id type="int">3</id>
      <name type="string">Isla</name>
      <active type="bool">true</active>
      <score type="float">8.9</score>
    </record>
  </records>
XML

XML_COERCE = {
  "int"    => ->(v) { v.to_i },
  "float"  => ->(v) { v.to_f },
  "bool"   => ->(v) { v.strip.downcase == "true" },
  "string" => ->(v) { v },
}.freeze

class XmlPipeline < DataPipeline
  def name = "XML Data Pipeline"

  private

  def extract
    doc = REXML::Document.new(XML_SOURCE)
    @records = doc.elements.collect("records/record") do |elem|
      rec = {}
      elem.elements.each do |child|
        rec[child.name.to_sym] = { _type: child.attributes["type"] || "string",
                                   _val:  child.text.to_s.strip }
      end
      rec
    end
    puts "  [Extract]   #{@records.size} <record> elements parsed from XML"
  end

  def transform
    @records.each do |rec|
      rec.each_key do |k|
        meta    = rec[k]
        coercer = XML_COERCE[meta[:_type]] || XML_COERCE["string"]
        rec[k]  = coercer.call(meta[:_val])
      end
    end
    puts "  [Transform] type attrs stripped · values coerced (int/float/bool)"
  end
end


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __FILE__ == $PROGRAM_NAME
  require 'set'

  SEP = "═" * 64

  puts "╔══════════════════════════════════════════════════════════════╗"
  puts "║       Template Method: Data Pipeline                         ║"
  puts "╚══════════════════════════════════════════════════════════════╝"

  puts "\n#{SEP}"
  puts "  Three pipelines, same skeleton, different formats"
  puts SEP

  [CsvPipeline.new, JsonPipeline.new, XmlPipeline.new].each(&:run)

  puts "\n#{SEP}"
  puts "  The template method in action:"
  puts "    Every pipeline ran: extract → transform → validate → load → report"
  puts "    validate() and load() are identical across all three; written once."
  puts "    Only extract() and transform() differed per format."
  puts SEP

  puts "\n╔══════════════════════════════════════════════════════════════╗"
  puts "║  Done                                                        ║"
  puts "╚══════════════════════════════════════════════════════════════╝"

end # __FILE__ == $PROGRAM_NAME
