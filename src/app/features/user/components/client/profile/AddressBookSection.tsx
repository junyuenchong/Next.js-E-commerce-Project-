"use client";

import { useAddressBookSection } from "@/app/features/user/hooks";

export default function AddressBookSection() {
  const {
    addresses,
    isLoading,
    msg,
    adding,
    form,
    setForm,
    editingId,
    editForm,
    setEditForm,
    editingIsDefault,
    addAddress,
    startEdit,
    cancelEdit,
    saveEdit,
    setDefault,
    remove,
  } = useAddressBookSection();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">Saved addresses</h2>
        <p className="text-sm text-gray-500 mt-2">Loading…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Saved addresses</h2>
        <p className="text-sm text-gray-600 mt-1">
          Add several addresses and pick a default for checkout. Your default is
          used first when you open checkout.
        </p>
      </div>

      {msg && <p className="text-sm text-gray-700">{msg}</p>}

      <ul className="space-y-3">
        {addresses.length === 0 ? (
          <li className="text-sm text-gray-500">No saved addresses yet.</li>
        ) : (
          addresses.map((a) => (
            <li
              key={a.id}
              className="border border-gray-200 rounded-lg p-4 text-sm space-y-2"
            >
              {editingId === a.id ? (
                <div className="space-y-2">
                  <input
                    value={editForm.label}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, label: e.target.value }))
                    }
                    placeholder="Label (e.g. Home)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <input
                    value={editForm.line1}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, line1: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Address line"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, city: e.target.value }))
                      }
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="City"
                    />
                    <input
                      value={editForm.postcode}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, postcode: e.target.value }))
                      }
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Postcode"
                    />
                  </div>
                  <input
                    value={editForm.country}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, country: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Country"
                  />
                  {editingIsDefault ? (
                    <p className="text-xs text-blue-700">
                      This is your default address.
                    </p>
                  ) : (
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={editForm.isDefault}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            isDefault: e.target.checked,
                          }))
                        }
                      />
                      Set as default
                    </label>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-xs hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      {a.label && (
                        <p className="font-medium text-gray-900">{a.label}</p>
                      )}
                      <p className="text-gray-800">{a.line1}</p>
                      <p className="text-gray-600">
                        {a.postcode} {a.city}, {a.country}
                      </p>
                      {a.isDefault && (
                        <span className="inline-block mt-1 text-[10px] uppercase tracking-wide font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {!a.isDefault && (
                        <button
                          type="button"
                          onClick={() => void setDefault(a.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className="text-xs text-gray-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(a.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>

      <form
        onSubmit={addAddress}
        className="space-y-3 pt-2 border-t border-gray-100"
      >
        <h3 className="text-sm font-semibold text-gray-900">Add address</h3>
        <input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          placeholder="Label (optional)"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          value={form.line1}
          onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
          placeholder="Address line *"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="City *"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          />
          <input
            value={form.postcode}
            onChange={(e) =>
              setForm((f) => ({ ...f, postcode: e.target.value }))
            }
            placeholder="Postcode *"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          />
        </div>
        <input
          value={form.country}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
          placeholder="Country"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) =>
              setForm((f) => ({ ...f, isDefault: e.target.checked }))
            }
          />
          Set as default address
        </label>
        <button
          type="submit"
          disabled={adding}
          className="w-full py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
        >
          {adding ? "Saving…" : "Add address"}
        </button>
      </form>
    </div>
  );
}
