"""Amazon Kindle Direct Publishing (KDP) *assistant*.

Amazon does not offer a public API for publishing to KDP. This package therefore never
contacts KDP: it validates manuscripts, covers and metadata locally, tracks project state,
and produces checklists for the **human-operated** upload at https://kdp.amazon.com.
It does not scrape KDP, automate the KDP website or handle KDP credentials.
"""
