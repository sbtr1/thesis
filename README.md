# thesis
Visual text analytics for tracking sentiment of company earnings calls

The file transcript_parser.r iterates through the transcripts and computes a sentiment score for each one. It also merges some financial measures and saves the output as master_summary.csv.

The file df_to_json.r takes the output from the previous step and saves the output in various JSON formats for easy visualization in D3.js.
