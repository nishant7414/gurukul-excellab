import { defineChallenge } from "./build";
import { countWhere, eq, MON3, n, s, ymd } from "./h";

const CNT = [["COUNTIF", "COUNTIFS", "SUMPRODUCT"]];
const first = (t: string) => t.slice(0, t.indexOf(" "));
const last = (t: string) => t.slice(t.indexOf(" ") + 1);
const fmt2 = (v: number) => (Math.round((v + Number.EPSILON) * 100) / 100).toFixed(2);

export const TX = [
  defineChallenge({
    id: "PC-TX-01", concept: "TX", tier: "Easy", ds: ["DS-HR-DIRECTORY"], title: "Split a full name into parts", minutes: 10, skill: "LEFT, MID, FIND",
    context: "The directory stores full names in one cell. The mail-merge needs first name, surname and a user name.",
    output: "First name, Surname and a lower-case first.last user name for 15 people.",
    hints: ["FIND(\" \", name) is the position of the space.", "First name = LEFT(name, space position - 1). Surname = MID(name, space position + 1, 50).", "Join with &\".\"& and wrap in LOWER."],
    explanation: "The space is the splitting point; LEFT takes what is before it, MID takes what is after it.",
    mistakes: ["Off-by-one when removing the space", "Hard-coding the first name's length", "Forgetting LOWER"],
    tasks: () => [
      { kind: "col", header: "First name", label: "First name", text: "In {range} return the first name.", deps: ["name"], required: [["LEFT", "TEXTBEFORE"]], expect: (x) => first(s(x.row.name ?? null)), formula: '=LEFT(@name,FIND(" ",@name)-1)' },
      { kind: "col", header: "Surname", label: "Surname", text: "In {range} return the surname.", deps: ["name"], required: [["MID", "RIGHT", "TEXTAFTER"]], expect: (x) => last(s(x.row.name ?? null)), formula: '=MID(@name,FIND(" ",@name)+1,50)' },
      { kind: "col", header: "User name", label: "User name", text: "In {range} return first.surname in lower case.", deps: ["name"], required: [["LOWER"]], expect: (x) => `${first(s(x.row.name ?? null))}.${last(s(x.row.name ?? null))}`.toLowerCase(), formula: '=LOWER(@ans0&"."&@ans1)' },
    ],
  }),
  defineChallenge({
    id: "PC-TX-02", concept: "TX", tier: "Easy", ds: ["DS-EDU-COURSES"], title: "Course catalogue labels", minutes: 10, skill: "Concatenation, RIGHT, LEFT",
    context: "The timetable prints a label for each course and groups courses by level (101 = 100-level).",
    output: "A label like CS101 - Intro to Programming (4 cr) and a level like 100-level for 12 courses.",
    hints: ["Join text and cells with &; numbers join as text automatically.", "The level is the first digit of the last three characters of the code: LEFT(RIGHT(code,3),1)."],
    explanation: "Concatenation (&) builds labels from several cells; RIGHT and LEFT extract the level digit from the code.",
    mistakes: ["Forgetting the spaces and punctuation as text", "Extracting from the wrong end of the code", "Using + instead of &"],
    tasks: () => [
      { kind: "col", header: "Label", label: "Course label", text: "In {range} return code, space, hyphen, space, title, then the credits in brackets, for example CS101 - Intro to Programming (4 cr).", deps: ["code", "title", "credits"], expect: (x) => `${s(x.row.code ?? null)} - ${s(x.row.title ?? null)} (${s(x.row.credits ?? null)} cr)`, formula: '=@code&" - "&@title&" ("&@credits&" cr)"' },
      { kind: "col", header: "Level", label: "Course level", text: "In {range} return the level, for example 100-level for a code ending in 101.", deps: ["code"], required: [["LEFT", "MID"]], expect: (x) => `${s(x.row.code ?? null).slice(-3, -2)}00-level`, formula: '=LEFT(RIGHT(@code,3),1)&"00-level"' },
    ],
  }),
  defineChallenge({
    id: "PC-TX-03", concept: "TX", tier: "Medium", ds: ["DS-HR-EMP"], title: "Login names and e-mail addresses", minutes: 15, skill: "LEFT, MID, FIND, LOWER, UPPER",
    context: "IT creates a login (first initial plus surname, lower case), an e-mail address on example.com and initials for badges.",
    output: "Login, E-mail and Initials for 60 employees.",
    hints: ["Login = LOWER(first letter & surname). The surname starts after the space.", "E-mail = login & \"@example.com\".", "Initials = UPPER(first letter of the first name & first letter of the surname)."],
    explanation: "Combining LEFT, MID and FIND slices the name; & joins the pieces; LOWER/UPPER standardise capitalisation.",
    mistakes: ["Taking the whole first name instead of the initial", "Leaving capital letters in the e-mail", "Re-typing the domain in each formula without &"],
    tasks: () => [
      { kind: "col", header: "Login", label: "Login", text: "In {range} return the first initial followed by the surname, in lower case.", deps: ["name"], required: [["LOWER"], ["LEFT"]], expect: (x) => `${s(x.row.name ?? null)[0]}${last(s(x.row.name ?? null))}`.toLowerCase(), formula: '=LOWER(LEFT(@name,1)&MID(@name,FIND(" ",@name)+1,50))' },
      { kind: "col", header: "E-mail", label: "E-mail", text: "In {range} return the login followed by @example.com.", deps: ["name"], expect: (x) => `${s(x.row.name ?? null)[0]}${last(s(x.row.name ?? null))}`.toLowerCase() + "@example.com", formula: '=@ans0&"@example.com"' },
      { kind: "col", header: "Initials", label: "Initials", text: "In {range} return the capital initials of the first name and the surname, for example AR.", deps: ["name"], required: [["UPPER"]], expect: (x) => `${s(x.row.name ?? null)[0]}${last(s(x.row.name ?? null))[0]}`.toUpperCase(), formula: '=UPPER(LEFT(@name,1)&MID(@name,FIND(" ",@name)+1,1))' },
    ],
  }),
  defineChallenge({
    id: "PC-TX-04", concept: "TX", tier: "Medium", ds: ["DS-SAL-CUSTOMERS"], title: "Customer codes and display labels", minutes: 15, skill: "UPPER, LEFT, RIGHT, LEN, concatenation",
    context: "CRM needs a short code combining the first three letters of the city with the customer number, a shouting display label and the length of the name for column sizing.",
    output: "A Code (e.g. PUN-0001), a Label (NAME (Segment)) and the name length for 80 customers.",
    hints: ["UPPER(LEFT(city,3)) gives the city prefix; RIGHT(id,4) gives the number.", "LEN(name) counts characters including spaces."],
    explanation: "Text functions slice and join cell contents; LEN measures a string.",
    mistakes: ["Using LEFT for the number", "Forgetting UPPER", "Counting the segment in LEN"],
    tasks: () => [
      { kind: "col", header: "Code", label: "Customer code", text: "In {range} return the first three letters of the city in capitals, a hyphen and the last four characters of the customer ID.", deps: ["city", "id"], required: [["UPPER"]], expect: (x) => `${s(x.row.city ?? null).slice(0, 3).toUpperCase()}-${s(x.row.id ?? null).slice(-4)}`, formula: '=UPPER(LEFT(@city,3))&"-"&RIGHT(@id,4)' },
      { kind: "col", header: "Label", label: "Display label", text: "In {range} return the name in capitals followed by the segment in brackets, e.g. AARAV SAXENA (Retail).", deps: ["name", "segment"], required: [["UPPER"]], expect: (x) => `${s(x.row.name ?? null).toUpperCase()} (${s(x.row.segment ?? null)})`, formula: '=UPPER(@name)&" ("&@segment&")"' },
      { kind: "col", header: "Name length", label: "Name length", text: "In {range} return the number of characters in the name.", deps: ["name"], required: [["LEN"]], expect: (x) => s(x.row.name ?? null).length, formula: "=LEN(@name)" },
    ],
  }),
  defineChallenge({
    id: "PC-TX-05", concept: "TX", tier: "Medium", ds: ["DS-OPS-RESTO"], title: "Print-ready bill lines", minutes: 15, skill: "TEXT with number formats, concatenation",
    context: "The point-of-sale printer needs each bill line as text: the item, quantity and unit price with two decimals, and a table tag.",
    output: "A Bill line like 'Garlic Naan x4 @ 70.00', a formatted line total and a table tag T08 for 200 lines.",
    hints: ["TEXT(price, \"0.00\") shows two decimals even for whole numbers.", "TEXT(qty*price, \"#,##0.00\") adds the thousands separator.", "TEXT(table, \"00\") pads a table number to two digits."],
    explanation: "TEXT converts a number to text in a given pattern so it can be joined to other text exactly as it will print.",
    mistakes: ["Joining the raw number (no decimals)", "Using a wrong format pattern", "Forgetting the quotes around the pattern"],
    tasks: () => [
      { kind: "col", header: "Bill line", label: "Bill line", text: "In {range} return item, \" x\", quantity, \" @ \" and the price with two decimals.", deps: ["item", "qty", "price"], required: [["TEXT"]], expect: (x) => `${s(x.row.item ?? null)} x${s(x.row.qty ?? null)} @ ${fmt2(n(x.row.price ?? null))}`, formula: '=@item&" x"&@qty&" @ "&TEXT(@price,"0.00")' },
      { kind: "col", header: "Line total", label: "Formatted line total", text: "In {range} return qty x price as text with thousands separator and two decimals.", deps: ["qty", "price"], required: [["TEXT"]], expect: (x) => (n(x.row.qty ?? null) * n(x.row.price ?? null)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), formula: '=TEXT(@qty*@price,"#,##0.00")' },
      { kind: "col", header: "Table tag", label: "Table tag", text: "In {range} return T followed by the table number with two digits (T08).", deps: ["table"], required: [["TEXT"]], expect: (x) => `T${String(n(x.row.table ?? null)).padStart(2, "0")}`, formula: '="T"&TEXT(@table,"00")' },
    ],
  }),
  defineChallenge({
    id: "PC-TX-06", concept: "TX", tier: "Medium", ds: ["DS-HR-RECRUIT"], title: "Candidate tags from roles and sources", minutes: 15, skill: "UPPER, SUBSTITUTE, RIGHT, concatenation",
    context: "The recruiting tool imports short tags: a 3-letter role code, a source tag with underscores and a combined candidate tag.",
    output: "Role code, Source tag and Candidate tag for 120 candidates.",
    hints: ["UPPER(LEFT(role,3)) is the role code.", "SUBSTITUTE(source, \" \", \"_\") replaces spaces with underscores.", "Candidate tag = role code & \"-\" & the last three characters of the candidate ID."],
    explanation: "SUBSTITUTE replaces text, UPPER changes case, RIGHT picks the number part of the ID.",
    mistakes: ["Replacing only the first space", "Case inconsistent tags", "Using the role instead of the code in the tag"],
    tasks: () => [
      { kind: "col", header: "Role code", label: "Role code", text: "In {range} return the first three letters of the role in capitals.", deps: ["role"], required: [["UPPER"]], expect: (x) => s(x.row.role ?? null).slice(0, 3).toUpperCase(), formula: "=UPPER(LEFT(@role,3))" },
      { kind: "col", header: "Source tag", label: "Source tag", text: "In {range} return the source in capitals with spaces replaced by underscores.", deps: ["source"], required: [["SUBSTITUTE"], ["UPPER"]], expect: (x) => s(x.row.source ?? null).toUpperCase().split(" ").join("_"), formula: '=UPPER(SUBSTITUTE(@source," ","_"))' },
      { kind: "col", header: "Candidate tag", label: "Candidate tag", text: "In {range} return the role code, a hyphen and the last three characters of the candidate ID.", deps: ["role", "id"], expect: (x) => `${s(x.row.role ?? null).slice(0, 3).toUpperCase()}-${s(x.row.id ?? null).slice(-3)}`, formula: '=@ans0&"-"&RIGHT(@id,3)' },
    ],
  }),
  defineChallenge({
    id: "PC-TX-07", concept: "TX", tier: "Hard", ds: ["DS-MKT-LEADS"], title: "Lead tags and a joined list of winning sources", minutes: 30, skill: "TEXTJOIN with FILTER, UNIQUE and SORT; text slicing on 700 rows",
    context: "Sales operations builds a tag for each lead and wants, for each owner, a one-cell text list of the sources that produced their Won leads.",
    output: "A Lead tag for 700 leads, then for five owners a comma-separated list of distinct Won sources in alphabetical order.",
    hints: ["Lead tag = first three letters of the source in capitals, \"/\", owner, \"/\", last four characters of the lead ID.", "FILTER the Source column for this owner and stage Won, then UNIQUE, then SORT.", "TEXTJOIN(\", \", TRUE, ...) joins the list; \"-\" is shown when there is none."],
    explanation: "Dynamic-array functions produce the list, TEXTJOIN turns it into a single text value. Each formula is independent of any helper column.",
    mistakes: ["Joining without UNIQUE (repeats)", "Not sorting (order differs)", "Forgetting the if_empty text in FILTER"],
    simulationNote: "FILTER, UNIQUE and SORT inside TEXTJOIN need Excel 2021 or Microsoft 365.",
    tasks: () => {
      return [
        { kind: "col", header: "Lead tag", label: "Lead tag", text: "In {range} return the source's first three letters in capitals, a slash, the owner, a slash and the last four characters of the lead ID.", deps: ["source", "owner", "id"], required: [["UPPER"]], expect: (x) => `${s(x.row.source ?? null).slice(0, 3).toUpperCase()}/${s(x.row.owner ?? null)}/${s(x.row.id ?? null).slice(-4)}`, formula: '=UPPER(LEFT(@source,3))&"/"&@owner&"/"&RIGHT(@id,4)' },
        { kind: "panel", title: "Winning sources", text: "In {range} list the distinct sources of each owner in {in} that have Won leads, A to Z, separated by commas.", deps: ["owner", "source", "stage"],
          inputs: [{ header: "Owner", values: ["Chirag", "Anil", "Bela", "Divya", "Eshan"] }],
          answers: [{ header: "Won sources", label: "Won sources by owner", required: [["TEXTJOIN"], ["FILTER"]], expect: (x) => { const srcs = [...new Set(x.T.leads.filter((l) => eq(l.owner ?? null, x.in[0]) && eq(l.stage ?? null, "Won")).map((l) => s(l.source ?? null)))].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); return srcs.length ? srcs.join(", ") : "-"; }, formula: '=TEXTJOIN(", ",TRUE,SORT(UNIQUE(FILTER(@@source,(@@owner=@in0)*(@@stage="Won"),"-"))))' }] },
      ];
    },
  }),
  defineChallenge({
    id: "PC-TX-08", concept: "TX", tier: "Hard", ds: ["DS-SUP-TICKETS"], title: "Ticket references and printable dates", minutes: 25, skill: "TEXTAFTER, TEXT dates, wildcards in COUNTIF",
    context: "The helpdesk exports 800 tickets. Reports need the agent's first name only, a reference line combining ID, priority initial and channel, and the opened date as dd-mmm-yyyy text.",
    output: "Agent name, Reference, Opened (text) and the number of Urgent web-form tickets, found by searching the reference text.",
    hints: ["The agent column reads 'Agent Sunita'; TEXTAFTER(agent, \" \") returns 'Sunita'.", "Reference = ID & \" | \" & first letter of priority in capitals & \" | \" & channel.", "TEXT(opened, \"dd-mmm-yyyy\") drops the time.", "COUNTIF supports wildcards: \"*| U | Web form\"."],
    explanation: "Text functions build the references, TEXT formats the date, and a wildcard COUNTIF searches the generated text.",
    mistakes: ["Using the time part of the date by mistake", "Case mismatch in the priority initial", "Forgetting the spaces around the bars"],
    tasks: () => [
      { kind: "col", header: "Agent name", label: "Agent first name", text: "In {range} return the agent's name without the word Agent.", deps: ["agent"], required: [["TEXTAFTER", "MID", "RIGHT", "SUBSTITUTE"]], expect: (x) => s(x.row.agent ?? null).slice(s(x.row.agent ?? null).indexOf(" ") + 1), formula: '=TEXTAFTER(@agent," ")' },
      { kind: "col", header: "Reference", label: "Reference", text: "In {range} return ticket ID, \" | \", the priority's first letter in capitals, \" | \" and the channel.", deps: ["id", "priority", "channel"], required: [["UPPER", "LEFT"]], expect: (x) => `${s(x.row.id ?? null)} | ${s(x.row.priority ?? null)[0].toUpperCase()} | ${s(x.row.channel ?? null)}`, formula: '=@id&" | "&UPPER(LEFT(@priority,1))&" | "&@channel' },
      { kind: "col", header: "Opened (text)", label: "Opened as text", text: "In {range} return the opened date as text like 14-Mar-2025.", deps: ["opened"], required: [["TEXT"]], expect: (x) => { const d = ymd(n(x.row.opened ?? null)); return `${String(d.d).padStart(2, "0")}-${MON3[d.m - 1]}-${d.y}`; }, formula: '=TEXT(@opened,"dd-mmm-yyyy")' },
      { kind: "cells", title: "Reference search", text: "In {range} count the tickets whose Reference shows priority U and channel Web form.", deps: ["id", "priority", "channel"], cells: [{ label: "Urgent web-form tickets", required: CNT, expect: (x) => countWhere(x.T.tickets, (r) => eq(r.priority ?? null, "Urgent") && eq(r.channel ?? null, "Web form")), formula: '=COUNTIF(@@ans1,"*| U | Web form")' }] },
    ],
  }),
];
