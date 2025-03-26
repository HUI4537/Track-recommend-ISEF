import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

class PlaceRecommender:
    def __init__(self, user_profiles, user_place_matrix, latent_features=2, learning_rate=0.01, num_epochs=1000):
        # 유저 프로필과 유저-장소 매트릭스 초기화
        self.user_profiles = user_profiles
        self.user_place_matrix = user_place_matrix
        self.latent_features = latent_features  # 잠재 요인 개수 설정
        self.learning_rate = learning_rate  # 학습률 설정
        self.num_epochs = num_epochs  # 학습 반복 횟수 설정
        self.model = SentenceTransformer('paraphrase-MiniLM-L6-v2')  # 문장 임베딩 모델 로드

        # 행렬 분해를 위한 잠재 요인 초기화
        np.random.seed(0)  # 무작위 시드 설정
        self.user_factors = {user: np.random.normal(scale=1.0 / latent_features, size=(latent_features,))
                             for user in user_profiles}  # 각 유저의 잠재 요인 초기화
        self.place_factors = {place: np.random.normal(scale=1.0 / latent_features, size=(latent_features,))
                              for place in range(self._get_num_places())}  # 각 장소의 잠재 요인 초기화

        # SGD를 이용하여 행렬 분해 수행
        self._train_matrix_factorization()

    def _get_num_places(self):
        # 장소의 총 개수 계산 (매트릭스 크기 설정에 사용)
        return max(place for visits in self.user_place_matrix.values() for place in visits) + 1

    def _train_matrix_factorization(self):
        # SGD를 사용하여 유저와 장소의 잠재 요인을 학습
        for epoch in range(self.num_epochs):
            for user, places in self.user_place_matrix.items():
                for place, rating in places.items():
                    error = rating - np.dot(self.user_factors[user], self.place_factors[place])  # 예측 오차 계산
                    # 오차 기반으로 유저 및 장소 잠재 요인 업데이트
                    self.user_factors[user] += self.learning_rate * error * self.place_factors[place]
                    self.place_factors[place] += self.learning_rate * error * self.user_factors[user]

    def _compute_text_similarity(self, new_text, existing_texts):
        # 새 텍스트와 기존 텍스트들 간의 코사인 유사도 계산
        new_embedding = self.model.encode(new_text)  # 새 텍스트 임베딩 생성
        similarities = {}
        for user_id, existing_text in existing_texts.items():
            existing_embedding = self.model.encode(existing_text)  # 기존 텍스트 임베딩 생성
            similarity = cosine_similarity([new_embedding], [existing_embedding])[0][0]  # 유사도 계산
            similarities[user_id] = similarity  # 유사도 저장
        return similarities

    def _compute_profile_similarity(self, new_profile):
        # 새로운 유저 프로필과 기존 유저 프로필들 간의 유사도 계산
        profile_vecs = []  # 프로필 벡터 리스트
        user_ids = []  # 유저 ID 리스트
        for user_id, profile in self.user_profiles.items():
            vec = [int(new_profile[key] == profile[key]) for key in ['age_range', 'gender', 'nationality']]  # 유사도 벡터 생성
            profile_vecs.append(vec)
            user_ids.append(user_id)
        profile_similarity = cosine_similarity([[1,1,1]], profile_vecs)[0]  # 코사인 유사도로 프로필 유사도 계산

        # travel_pref와 food_pref의 유사도 계산
        travel_pref_similarity = self._compute_text_similarity(new_profile['travel_pref'],
                                                               {user_id: profile['travel_pref'] for user_id, profile in self.user_profiles.items()})
        food_pref_similarity = self._compute_text_similarity(new_profile['food_pref'],
                                                             {user_id: profile['food_pref'] for user_id, profile in self.user_profiles.items()})

        # 유사도를 가중치로 결합 (travel_pref와 food_pref는 각각 0.3, 나머지는 0.4로 설정)
        combined_similarity = {user_id: profile_similarity[idx] * 0.4 + travel_pref_similarity[user_id] * 0.3 + food_pref_similarity[user_id] * 0.3
                               for idx, user_id in enumerate(user_ids)}
        return combined_similarity

    def place_recommend(self, new_user_profile, top_n=10):
        # 새로운 유저 프로필과 기존 유저들 간의 유사도 점수 계산
        profile_similarity = self._compute_profile_similarity(new_user_profile)

        # 비슷한 유저들의 선호도를 기반으로 장소별 예상 평점 계산
        predicted_ratings = {place: 0 for place in self.place_factors}
        for user_id, similarity in profile_similarity.items():
            for place, rating in self.user_place_matrix.get(user_id, {}).items():
                predicted_ratings[place] += similarity * np.dot(self.user_factors[user_id], self.place_factors[place])  # 예상 평점 계산

        # 예상 평점 순으로 정렬하여 상위 n개의 장소 추천
        recommended_places = sorted(predicted_ratings, key=predicted_ratings.get, reverse=True)
        return recommended_places[:top_n]  # 추천 장소 반환