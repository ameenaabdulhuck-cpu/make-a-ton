export default function PrintFooter() {
  return (
    <div className="form-actions">
      <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
        Download PDF
      </button>
    </div>
  );
}
