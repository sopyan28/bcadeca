import { createClient } from '@/lib/supabase/server';
import { colors, fonts, fieldStyle, pressedButton } from '@/lib/ui/tokens';
import { uploadConferenceDocument, deleteConferenceDocument } from '../actions';

const DOC_TYPE_LABELS: Record<string, string> = {
  permission_slip: 'Permission slip',
  packing_list: 'Packing list',
  rooming_form: 'Rooming form',
};

export default async function OfficerDocumentsPage() {
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from('conference_documents')
    .select('id, conference, doc_type, storage_path, file_name, uploaded_at')
    .order('uploaded_at', { ascending: false });

  async function upload(formData: FormData) {
    'use server';
    await uploadConferenceDocument(formData);
  }

  async function remove(formData: FormData) {
    'use server';
    await deleteConferenceDocument(String(formData.get('id')), String(formData.get('storagePath')));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
      <form
        action={upload}
        encType="multipart/form-data"
        style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 15, color: colors.navy }}>Upload document</div>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Conference
          <select name="conference" defaultValue="SCDC" style={{ ...fieldStyle, marginTop: 6 }}>
            <option value="SCDC">SCDC</option>
            <option value="ICDC">ICDC</option>
          </select>
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          Document type
          <select name="docType" defaultValue="permission_slip" style={{ ...fieldStyle, marginTop: 6 }}>
            <option value="permission_slip">Permission slip</option>
            <option value="packing_list">Packing list</option>
            <option value="rooming_form">Rooming form</option>
          </select>
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
          File
          <input name="file" type="file" required accept="application/pdf" style={{ ...fieldStyle, marginTop: 6, padding: 8 }} />
        </label>
        <button type="submit" style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '11px 0' }}>
          Upload
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(docs ?? []).map((d) => (
          <div key={d.id} style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy }}>{d.file_name}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {d.conference} &middot; {DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type}
              </div>
            </div>
            <form action={remove}>
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="storagePath" value={d.storage_path} />
              <button type="submit" style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.redDark, fontWeight: 800, fontSize: 12.5 }}>
                Delete
              </button>
            </form>
          </div>
        ))}
        {(!docs || docs.length === 0) && <div style={{ color: colors.textMuted, fontSize: 14 }}>No documents uploaded yet.</div>}
      </div>
    </div>
  );
}
