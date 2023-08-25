export const PAGE_SIZE = 20;

export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  listenerProfile: {
    include: {
      reviews: {
        include: {
          user: true,
        },
      },
    },
  },
  nickname: true,
  profilePicture: true,
  programs: true,
};

export const emailInviteTemplate = {
  support: 'd-27bef09baeab473694b8886b2e60fe31',
  cof: 'd-363df1c8e77545e0b430ade0ee37e662',
  group: 'd-fab913d2072848f7bedf820bf0a241fb',
};

export const AllZeroUUID = '00000000-0000-0000-0000-000000000000';
